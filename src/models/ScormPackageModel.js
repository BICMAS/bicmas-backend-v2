// import { prisma } from '../utils/db.js';
// import AdmZip from 'adm-zip';
// import fs from 'fs';
// import path from 'path';
// import { put } from '@vercel/blob';
// import { parseStringPromise } from 'xml2js';
// import crypto from 'crypto';
// import dotenv from 'dotenv';
// dotenv.config()
// import { S3Client } from '@aws-sdk/client-s3';
// import { Upload } from '@aws-sdk/lib-storage';
// import mime from 'mime-types';


import { prisma } from '../utils/db.js';
import { ScormCloudService } from '../services/ScormCloudService.js';
import fs from 'fs';
import path from 'path';
import { parseManifestActivitiesFromZip } from '../lib/scormManifestParser.js';
import {
    assertModuleUnlocked,
    resolveStartScoForModule,
} from '../lib/modulePacing.js';

export class ScormPackageModel {
    static getErrorMessage(error, fallback = 'SCORM launch failed') {
        const status = error?.response?.status;
        const data = error?.response?.data;
        const detail = typeof data === 'string'
            ? data
            : data?.message || data?.error || (data && Object.keys(data).length > 0 ? JSON.stringify(data) : null);
        return `${fallback}${status ? ` (status ${status})` : ''}: ${detail || error.message || 'Unknown launch error'}`;
    }

    static async uploadAndExtract(filePath, filename, uploadedBy, lessonId = null) {
        console.log('[MODEL] Uploading to SCORM Cloud', { filename, lessonId });

        // 1. Submit the file to SCORM Cloud's import queue. This streams the file
        //    and returns as soon as the job is accepted — it does NOT block for the
        //    (potentially ~30 min) import. The generated courseId is also the
        //    scormCloudId, so we already have everything we need to launch later.
        const packageSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;

        let manifestData = { activities: [] };
        try {
            manifestData = await parseManifestActivitiesFromZip(filePath);
            console.log(`[MODEL] Parsed ${manifestData.activities.length} SCORM activities from manifest`);
        } catch (parseErr) {
            console.warn('[MODEL] Manifest parse skipped:', parseErr.message);
        }

        const { jobId, courseId } = await ScormCloudService.submitCourseUpload(filePath, filename, lessonId);

        // 2. Persist the package immediately and respond fast so Railway's proxy
        //    never times out (which is what produced the 502 / CORS errors).
        const pkg = await prisma.scormPackage.create({
            data: {
                filename,
                storagePath: `scormcloud://${courseId}`,
                manifestJson: {
                    activities: manifestData.activities ?? [],
                    organizationId: manifestData.organizationId ?? null,
                    schemaVersion: manifestData.schemaVersion ?? null,
                },
                scormVersion: 'V2004', // sensible default; corrected once import finishes
                encrypted: false,
                checksum: `cloud-${Date.now()}`,
                launchFile: null,
                uploadedBy,
                uploadedAt: new Date(),
                blobs: [],
                fileCount: 0,
                packageSize,
                scormCloudId: courseId,
            },
            include: { uploader: { select: { id: true, fullName: true, email: true } } },
        });

        // 3. SCORM Cloud now owns the file; remove the local temp copy.
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        // 4. Confirm the import in the background: fix the SCORM version on success,
        //    or remove the orphaned record on failure so admins can retry.
        void this.finalizeImportInBackground(jobId, courseId, filename, pkg.id);

        return {
            ...pkg,
            scormCloudCourseId: courseId,
            status: 'PROCESSING',
        };
    }

    /**
     * Polls SCORM Cloud until the import job for a freshly uploaded package
     * completes. Runs detached from the HTTP request so the upload response is
     * fast. Updates the stored SCORM version on success and deletes the package
     * record if the import ultimately fails.
     */
    static async finalizeImportInBackground(jobId, courseId, filename, packageId) {
        try {
            const result = await ScormCloudService.waitForImportJob(jobId, courseId, filename);

            const scormVersion = (result.scormVersion?.includes('2004') || result.scormVersion?.includes('4th'))
                ? 'V2004'
                : 'V1_2';

            await prisma.scormPackage.update({
                where: { id: packageId },
                data: { scormVersion },
            });

            console.log(`[SCORM IMPORT FINALIZE] Course ${courseId} ready (${result.title})`);
        } catch (err) {
            console.error(`[SCORM IMPORT FINALIZE] Import failed for course ${courseId}:`, err.message);

            try {
                await prisma.scormPackage.delete({ where: { id: packageId } });
                console.log(`[SCORM IMPORT FINALIZE] Removed orphaned package ${packageId}`);
            } catch (cleanupErr) {
                console.error('[SCORM IMPORT FINALIZE] Cleanup delete failed:', cleanupErr.message);
            }
        }
    }

    static async findById(id) {
        return prisma.scormPackage.findUnique({
            where: { id },
            include: { uploader: true }
        });
    }

    static async getLaunchUrl(packageId, userId, userFullName, options = {}) {
        console.log('[LAUNCH] Getting URL for package:', packageId, 'user:', userId, 'options:', options);

        const pkg = await this.findById(packageId);
        if (!pkg) throw new Error('Package not found');

        const scormCloudId = pkg.scormCloudId;
        if (!scormCloudId) throw new Error('No SCORM Cloud ID');

        let startSco = options.startSco ?? null;
        if (options.moduleId && options.courseId) {
            await assertModuleUnlocked(userId, options.courseId, options.moduleId);
            if (!startSco) {
                startSco = await resolveStartScoForModule(options.moduleId);
            }
        }

        const launchOptions = startSco ? { startSco } : {};

        const getOrCreateCourseAttempt = async () => {
            if (!options.courseId) return null;

            return prisma.attempt.upsert({
                where: {
                    userId_courseId: {
                        userId,
                        courseId: options.courseId
                    }
                },
                update: {
                    scormPackageId: packageId,
                    status: 'IN_PROGRESS',
                    updatedAt: new Date()
                },
                create: {
                    userId,
                    courseId: options.courseId,
                    scormPackageId: packageId,
                    status: 'IN_PROGRESS',
                    completionPercentage: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                select: { id: true }
            });
        };

        // 1. Find existing ScormAttempt (any record for this user + package)
        let scormAttempt = await prisma.scormAttempt.findFirst({
            where: {
                userId,
                scormPackageId: packageId
            },
            select: { id: true, scormCloudRegistrationId: true, attemptId: true }
        });

        let registrationId = scormAttempt?.scormCloudRegistrationId;
        let launchUrl;

        const createFreshRegistrationAndLaunch = async () => {
            const result = await ScormCloudService.createLaunchLink(
                scormCloudId,
                userId,
                userFullName || 'Learner',
                launchOptions,
            );

            registrationId = result.registrationId;
            launchUrl = result.launchUrl;
            return result;
        };

        try {
            if (options.forceNewRegistration) {
                console.log('[LAUNCH RETAKE] Creating fresh registration for package:', packageId);
                await createFreshRegistrationAndLaunch();

                const courseAttempt = await getOrCreateCourseAttempt();
                if (courseAttempt?.id) {
                    await prisma.attempt.update({
                        where: { id: courseAttempt.id },
                        data: {
                            status: 'IN_PROGRESS',
                            completionPercentage: 0,
                            score: null,
                            updatedAt: new Date(),
                        },
                    });
                }

                if (scormAttempt) {
                    await prisma.scormAttempt.update({
                        where: { id: scormAttempt.id },
                        data: {
                            scormCloudRegistrationId: registrationId,
                            attemptId: courseAttempt?.id || scormAttempt.attemptId,
                            status: 'IN_PROGRESS',
                            completionPercentage: 0,
                            score: null,
                            scormCloudCompletion: null,
                            scormCloudScoreScaled: null,
                            learningHours: null,
                            updatedAt: new Date(),
                        },
                    });
                } else {
                    scormAttempt = await prisma.scormAttempt.create({
                        data: {
                            userId,
                            scormPackageId: packageId,
                            attemptId: courseAttempt?.id || null,
                            scormCloudRegistrationId: registrationId,
                            status: 'IN_PROGRESS',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                    });
                }
            } else if (registrationId) {
                console.log(`[LAUNCH REUSE] Using existing registrationId: ${registrationId}`);

                const client = ScormCloudService.init();

                const launchPayload = {
                    redirectOnExitUrl: 'https://bicmas-trainee.vercel.app/scorm-exit.html',
                };
                if (startSco) {
                    launchPayload.startSco = startSco;
                }

                try {
                    const launchRes = await client.post(
                        `/registrations/${registrationId}/launchLink`,
                        launchPayload
                    );

                    launchUrl = launchRes.data.launchLink;
                    if (!launchUrl) throw new Error('No launchLink returned');
                } catch (error) {
                    const status = error?.response?.status;
                    const shouldRecreate = status === 404 || status === 400;
                    if (!shouldRecreate) throw error;

                    console.warn(`[LAUNCH REUSE FAIL] registrationId ${registrationId} unavailable in cloud. Recreating...`);
                    await createFreshRegistrationAndLaunch();

                    await prisma.scormAttempt.update({
                        where: { id: scormAttempt.id },
                        data: { scormCloudRegistrationId: registrationId, updatedAt: new Date() }
                    });
                }

                if (!scormAttempt.attemptId) {
                    const courseAttempt = await getOrCreateCourseAttempt();
                    if (courseAttempt?.id) {
                        await prisma.scormAttempt.update({
                            where: { id: scormAttempt.id },
                            data: { attemptId: courseAttempt.id, updatedAt: new Date() }
                        });
                        scormAttempt.attemptId = courseAttempt.id;
                    }
                }
            } else {
                console.log('[LAUNCH] No existing registration → creating new');
                await createFreshRegistrationAndLaunch();

                // Create ScormAttempt and link to course Attempt if course context exists
                const courseAttempt = await getOrCreateCourseAttempt();

                scormAttempt = await prisma.scormAttempt.create({
                    data: {
                        userId,
                        scormPackageId: packageId,
                        attemptId: courseAttempt?.id || null,
                        scormCloudRegistrationId: registrationId,
                        status: 'IN_PROGRESS',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });

                console.log(`[LAUNCH] Created ScormAttempt ${scormAttempt.id} with regId ${registrationId}`);
            }
        } catch (error) {
            throw new Error(this.getErrorMessage(error, 'Failed to create SCORM launch URL'));
        }

        // Always return both values to frontend
        return {
            launchUrl,
            scormAttemptId: scormAttempt.id
        };
    }
}




// // Initialize S3 client once
// const s3Client = new S3Client({
//     region: process.env.AWS_REGION,
//     credentials: {
//         accessKeyId: process.env.AMAZON_S3_ACCESS_KEY_ID,
//         secretAccessKey: process.env.AMAZON_S3_ACCESS_SECRET,
//     },
//     maxAttempts: 3,
// });

// export class ScormPackageModel {
//     static async uploadAndExtract(filePath, filename, uploadedBy) {
//         console.log('[SCORM UPLOAD START]', { filePath, filename, uploadedBy });

//         // Generate unique folder name
//         const timestamp = Date.now();
//         const safeFilename = filename
//             .replace(/[^a-zA-Z0-9-_.]/g, '_')
//             .replace(/\.zip$/i, '')
//             .substring(0, 100);
//         const folderHandle = `scorm/${timestamp}-${safeFilename}/`;

//         // Create temp directories
//         const tempDir = path.join(process.cwd(), 'uploads', 'temp');
//         const extractDir = path.join(tempDir, folderHandle.replace(/\//g, '-'));

//         // Ensure directories exist
//         fs.mkdirSync(tempDir, { recursive: true });
//         if (fs.existsSync(extractDir)) {
//             fs.rmSync(extractDir, { recursive: true, force: true });
//         }
//         fs.mkdirSync(extractDir, { recursive: true });

//         let manifestJson = null;
//         let launchFile = 'index.html';
//         let scormVersion = 'SCORM_1_2'; // Default enum value
//         const uploadedUrls = [];

//         try {
//             // 1. Extract ZIP file
//             console.log('[SCORM] Extracting ZIP to:', extractDir);
//             const zip = new AdmZip(filePath);
//             zip.extractAllTo(extractDir, true);
//             console.log('[SCORM] ZIP extracted successfully');

//             // 2. Find and parse manifest file
//             const findManifestFile = (dir) => {
//                 const files = [];

//                 const scanDir = (currentDir) => {
//                     try {
//                         const items = fs.readdirSync(currentDir, { withFileTypes: true });

//                         for (const item of items) {
//                             const fullPath = path.join(currentDir, item.name);

//                             if (item.isDirectory()) {
//                                 scanDir(fullPath);
//                             } else if (item.name.toLowerCase() === 'imsmanifest.xml') {
//                                 files.push(fullPath);
//                             }
//                         }
//                     } catch (err) {
//                         console.warn('[SCORM] Error scanning directory:', err.message);
//                     }
//                 };

//                 scanDir(dir);
//                 return files.length > 0 ? files[0] : null;
//             };

//             const manifestPath = findManifestFile(extractDir);
//             if (!manifestPath) {
//                 throw new Error('SCORM manifest (imsmanifest.xml) not found in package');
//             }

//             console.log('[SCORM] Found manifest at:', manifestPath);
//             const manifestXml = fs.readFileSync(manifestPath, 'utf8');
//             manifestJson = await parseStringPromise(manifestXml, {
//                 explicitArray: false,
//                 mergeAttrs: true,
//                 trim: true
//             });

//             // 3. Map SCORM version to Prisma enum
//             const getValidScormVersion = (manifest) => {
//                 try {
//                     // From your manifest, it shows: "schemaversion": "2004 4th Edition"
//                     const version = manifest?.manifest?.metadata?.schemaversion ||
//                         manifest?.manifest?.$?.version ||
//                         manifest?.manifest?.$?.scormVersion ||
//                         '1.2';

//                     const versionStr = String(version).toUpperCase().trim();
//                     console.log('[SCORM] Raw version detected:', versionStr);

//                     // Map to YOUR Prisma enum values
//                     if (versionStr.includes('2004') || versionStr.includes('4TH')) {
//                         return 'V2004'; // Your schema uses V2004
//                     }
//                     if (versionStr.includes('1.2') || versionStr === '1.2' ||
//                         versionStr === 'SCORM1.2' || versionStr === 'SCORM 1.2' ||
//                         versionStr === 'SCORM_1.2' || versionStr === 'V1.2') {
//                         return 'V1_2'; // Your schema uses V1_2
//                     }

//                     // Default to V1_2 (most common)
//                     return 'V1_2';
//                 } catch (error) {
//                     console.warn('[SCORM] Version detection error:', error.message);
//                     return 'V1_2';
//                 }
//             };

//             scormVersion = getValidScormVersion(manifestJson);
//             console.log('[SCORM] Mapped version for DB:', scormVersion);
//             // 4. Determine launch file
//             const getLaunchFileFromManifest = (manifest) => {
//                 try {
//                     // Try SCORM 2004 structure first
//                     if (manifest.manifest?.resources?.resource) {
//                         const resource = manifest.manifest.resources.resource;

//                         // Handle array or single object
//                         const targetResource = Array.isArray(resource) ? resource[0] : resource;

//                         // Look for launch file in different possible locations
//                         if (targetResource.href) {
//                             return targetResource.href;
//                         }

//                         if (targetResource.file) {
//                             const file = Array.isArray(targetResource.file)
//                                 ? targetResource.file[0]
//                                 : targetResource.file;
//                             if (file.href) return file.href;
//                         }

//                         // Look for organization -> item -> resource
//                         if (manifest.manifest?.organizations?.organization) {
//                             const org = Array.isArray(manifest.manifest.organizations.organization)
//                                 ? manifest.manifest.organizations.organization[0]
//                                 : manifest.manifest.organizations.organization;

//                             if (org.item) {
//                                 const item = Array.isArray(org.item) ? org.item[0] : org.item;
//                                 if (item.identifierref && targetResource.identifier === item.identifierref) {
//                                     // Fallback to index.html in same directory as manifest
//                                     return 'index.html';
//                                 }
//                             }
//                         }
//                         // After parsing manifest, add:
//                         console.log('[SCORM DEBUG] Metadata:', JSON.stringify(manifestJson?.manifest?.metadata, null, 2));
//                         console.log('[SCORM DEBUG] Attributes:', manifestJson?.manifest?.$);
//                     }
//                 } catch (error) {
//                     console.warn('[SCORM] Error parsing launch file:', error.message);
//                 }

//                 // Default fallback
//                 return 'index.html';
//             };

//             launchFile = getLaunchFileFromManifest(manifestJson);
//             launchFile = launchFile.replace(/\\/g, '/'); // Normalize path
//             console.log('[SCORM] Launch file:', launchFile);


//             // 5. Calculate checksum
//             const fileBuffer = fs.readFileSync(filePath);
//             const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
//             console.log('[SCORM] Package checksum:', checksum);

//             // 6. Check for duplicate packages
//             const existingPackage = await prisma.scormPackage.findFirst({
//                 where: { checksum },
//                 include: { uploader: true }
//             });

//             if (existingPackage) {
//                 console.log('[SCORM] Duplicate package found, returning existing');
//                 // Clean up temp files
//                 fs.rmSync(extractDir, { recursive: true, force: true });
//                 fs.unlinkSync(filePath);
//                 return existingPackage;
//             }

//             // 7. Upload all files to S3
//             console.log('[SCORM] Starting S3 upload...');

//             const getAllFiles = (dir, baseDir = dir) => {
//                 const files = [];

//                 const walk = (currentDir) => {
//                     try {
//                         const items = fs.readdirSync(currentDir, { withFileTypes: true });

//                         for (const item of items) {
//                             const fullPath = path.join(currentDir, item.name);

//                             if (item.isDirectory()) {
//                                 walk(fullPath);
//                             } else {
//                                 const relativePath = path.relative(baseDir, fullPath);
//                                 files.push({
//                                     fullPath,
//                                     relativePath: relativePath.replace(/\\/g, '/')
//                                 });
//                             }
//                         }
//                     } catch (err) {
//                         console.warn('[SCORM] Error walking directory:', err.message);
//                     }
//                 };

//                 walk(dir);
//                 return files;
//             };

//             const filesToUpload = getAllFiles(extractDir);
//             console.log(`[SCORM] Found ${filesToUpload.length} files to upload`);

//             // Upload in batches to avoid memory issues
//             const batchSize = 10;

//             for (let i = 0; i < filesToUpload.length; i += batchSize) {
//                 const batch = filesToUpload.slice(i, i + batchSize);
//                 const batchPromises = [];

//                 for (const file of batch) {
//                     try {
//                         // Calculate S3 key
//                         const key = `${folderHandle}${file.relativePath}`;

//                         // Determine content type
//                         const contentType = this.getContentType(path.extname(file.relativePath));

//                         // Upload to S3 (NO ACL - using bucket policy)
//                         const upload = new Upload({
//                             client: s3Client,
//                             params: {
//                                 Bucket: process.env.AMAZON_S3_BUCKET,
//                                 Key: key,
//                                 Body: fs.createReadStream(file.fullPath),
//                                 ContentType: contentType,
//                                 CacheControl: 'public, max-age=31536000, immutable',
//                                 // IMPORTANT: No ACL - bucket policy handles access
//                                 Metadata: {
//                                     'original-filename': path.basename(file.relativePath),
//                                     'scorm-package': safeFilename,
//                                     'uploaded-at': new Date().toISOString()
//                                 }
//                             },
//                             partSize: 10 * 1024 * 1024,
//                             queueSize: 4,
//                         });

//                         batchPromises.push(
//                             upload.done()
//                                 .then(() => {
//                                     // Construct public URL
//                                     const publicUrl = `https://${process.env.AMAZON_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
//                                     uploadedUrls.push(publicUrl);

//                                     console.log(`[S3 UPLOAD SUCCESS] ${file.relativePath}`);
//                                     return publicUrl;
//                                 })
//                                 .catch(error => {
//                                     console.error(`[S3 UPLOAD FAILED] ${file.relativePath}:`, error.message);
//                                     throw new Error(`Failed to upload ${file.relativePath}: ${error.message}`);
//                                 })
//                         );
//                     } catch (error) {
//                         console.error(`[S3 UPLOAD PREP FAILED] ${file.relativePath}:`, error.message);
//                         throw error;
//                     }
//                 }

//                 // Wait for batch to complete
//                 await Promise.all(batchPromises);
//                 console.log(`[SCORM] Batch ${Math.floor(i / batchSize) + 1} completed (${Math.min(i + batchSize, filesToUpload.length)}/${filesToUpload.length})`);
//             }

//             console.log(`[SCORM] All ${uploadedUrls.length} files uploaded to S3`);

//             // 8. Save to database
//             console.log('[SCORM] Saving to database...');

//             const packageData = await prisma.scormPackage.create({
//                 data: {
//                     filename,
//                     storagePath: folderHandle,
//                     manifestJson,
//                     scormVersion, // This now matches Prisma enum
//                     encrypted: false,
//                     checksum,
//                     uploadedAt: new Date(),
//                     uploadedBy: uploadedBy,
//                     blobs: uploadedUrls,
//                     launchFile,
//                     fileCount: uploadedUrls.length,
//                     packageSize: fileBuffer.length,
//                 },
//                 include: {
//                     uploader: {
//                         select: {
//                             id: true,
//                             fullName: true,
//                             email: true
//                         }
//                     }
//                 }
//             });

//             console.log('[SCORM] Package saved to database with ID:', packageData.id);

//             // Return with additional metadata
//             return {
//                 ...packageData,
//                 totalFiles: uploadedUrls.length,
//                 totalSize: fileBuffer.length,
//                 s3BaseUrl: `https://${process.env.AMAZON_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${folderHandle}`,
//                 launchUrl: `https://${process.env.AMAZON_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${folderHandle}${launchFile}`
//             };

//         } catch (error) {
//             console.error('[SCORM UPLOAD ERROR]', error);

//             // Clean up uploaded files if there was an error
//             if (uploadedUrls.length > 0) {
//                 console.log('[SCORM] Partial upload occurred. Files uploaded:', uploadedUrls.length);
//                 // Note: You might want to implement S3 cleanup here for failed uploads
//             }

//             throw new Error(`SCORM upload failed: ${error.message}`);

//         } finally {
//             // 9. Clean up temporary files
//             try {
//                 if (fs.existsSync(extractDir)) {
//                     fs.rmSync(extractDir, { recursive: true, force: true });
//                     console.log('[SCORM] Temp directory cleaned');
//                 }

//                 if (fs.existsSync(filePath)) {
//                     fs.unlinkSync(filePath);
//                     console.log('[SCORM] Original ZIP file removed');
//                 }
//             } catch (cleanupError) {
//                 console.warn('[SCORM] Cleanup warning:', cleanupError.message);
//             }
//         }
//     }

//     // Helper method to get content type
//     static getContentType(ext) {
//         const extLower = ext.toLowerCase();
//         const types = {
//             '.html': 'text/html',
//             '.htm': 'text/html',
//             '.js': 'application/javascript',
//             '.css': 'text/css',
//             '.json': 'application/json',
//             '.xml': 'application/xml',
//             '.png': 'image/png',
//             '.jpg': 'image/jpeg',
//             '.jpeg': 'image/jpeg',
//             '.gif': 'image/gif',
//             '.svg': 'image/svg+xml',
//             '.pdf': 'application/pdf',
//             '.swf': 'application/x-shockwave-flash',
//             '.txt': 'text/plain',
//             '.mp4': 'video/mp4',
//             '.webm': 'video/webm',
//             '.ogg': 'video/ogg',
//             '.ogv': 'video/ogg',
//             '.m4v': 'video/mp4',
//             '.avi': 'video/x-msvideo',
//             '.mov': 'video/quicktime',
//             '.wmv': 'video/x-ms-wmv',
//             '.flv': 'video/x-flv',
//             '.mpg': 'video/mpeg',
//             '.mpeg': 'video/mpeg',
//             '.mp3': 'audio/mpeg',
//             '.wav': 'audio/wav',
//             '.aac': 'audio/aac',
//             '.m4a': 'audio/mp4',
//             '.woff': 'font/woff',
//             '.woff2': 'font/woff2',
//             '.ttf': 'font/ttf',
//             '.eot': 'application/vnd.ms-fontobject',
//             '.otf': 'font/otf',
//             '.zip': 'application/zip',
//             '.xap': 'application/x-silverlight-app',
//         };
//         return types[extLower] || 'application/octet-stream';
//     }

//     static async getLaunchUrl(id) {
//         const pkg = await this.findById(id);
//         if (!pkg) throw new Error('Package not found');

//         // Use the launch file from database
//         const launchFile = pkg.launchFile || 'index.html';

//         // Construct the S3 URL
//         const baseUrl = `https://${process.env.AMAZON_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`;
//         const storagePath = pkg.storagePath.endsWith('/') ? pkg.storagePath : `${pkg.storagePath}/`;

//         return `${baseUrl}/${storagePath}${launchFile}`;
//     }

//     static async findById(id) {
//         return prisma.scormPackage.findUnique({
//             where: { id },
//             include: { uploader: true }
//         });
//     }

//     // Optional: Method to configure S3 CORS programmatically
//     static async configureS3Cors() {
//         const { PutBucketCorsCommand } = await import('@aws-sdk/client-s3');

//         try {
//             const command = new PutBucketCorsCommand({
//                 Bucket: process.env.AMAZON_S3_BUCKET,
//                 CORSConfiguration: {
//                     CORSRules: [
//                         {
//                             AllowedHeaders: ["*"],
//                             AllowedMethods: ["GET", "HEAD"],
//                             AllowedOrigins: ["*"], // Change to specific origins in production
//                             ExposeHeaders: [
//                                 "ETag",
//                                 "Content-Type",
//                                 "Content-Length",
//                                 "Content-Range",
//                                 "Accept-Ranges"
//                             ],
//                             MaxAgeSeconds: 3000
//                         }
//                     ]
//                 }
//             });

//             await s3Client.send(command);
//             console.log('✅ S3 CORS configured successfully');
//             return true;
//         } catch (error) {
//             console.warn('⚠️ Could not configure CORS (may need console setup):', error.message);
//             return false;
//         }
//     }
// }

