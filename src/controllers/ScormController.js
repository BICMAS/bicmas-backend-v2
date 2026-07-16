// src/controllers/ScormController.js
import fs from 'fs';
import { ScormService } from '../service/ScormService.js';
import { AttemptService } from '../service/AttemptService.js';
import { prisma } from '../utils/db.js';
import { ScormCloudService } from '../services/ScormCloudService.js';
import { computeScorePercent } from '../utils/scormScore.js';

export const uploadPackage = async (req, res) => {
    console.log('[SCORM CONTROLLER] Upload request received');

    if (!req.file) {
        return res.status(400).json({
            error: 'No file uploaded. Please use "package" field with a SCORM ZIP file.'
        });
    }

    console.log('[SCORM CONTROLLER] File:', {
        name: req.file.originalname,
        size: req.file.size,
        path: req.file.path
    });

    try {
        const uploadedBy = req.user.id;
        const result = await ScormService.uploadPackage(
            req.file.path,
            req.file.originalname,
            uploadedBy
        );

        console.log('[SCORM CONTROLLER] Upload successful:', result.id);

        res.status(201).json({
            success: true,
            data: result,
            message: 'SCORM package uploaded successfully to SCORM Cloud'
        });

    } catch (error) {
        console.error('[SCORM CONTROLLER UPLOAD ERROR]', error.message);

        // Clean up temp file if upload failed
        try {
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        } catch (cleanupError) {
            console.warn('[SCORM CONTROLLER] Failed to clean temp file:', cleanupError.message);
        }

        const statusCode = error.message.includes('not found') ? 404 :
            error.message.includes('credentials') ? 401 :
                error.message.includes('permission') ? 403 : 400;

        res.status(statusCode).json({
            success: false,
            error: error.message,
            details: error.details || null
        });
    }
};

// src/controllers/ScormController.js (getLaunch)
export const getLaunch = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('[SCORM CONTROLLER] Launch request for package:', id);

        if (!id) {
            return res.status(400).json({ success: false, error: 'Package ID required' });
        }

        const { launchUrl, scormAttemptId } = await ScormService.getLaunchUrl(
            id,
            req.user.id,
            req.user.fullName || req.user.email,
            req.query
        );

        console.log('[SCORM CONTROLLER] Launch URL generated');

        res.json({
            success: true,
            launchUrl,
            scormAttemptId,   // ← Now returned to frontend
            message: 'Launch URL generated successfully'
        });
    } catch (error) {
        console.error('[SCORM CONTROLLER LAUNCH ERROR]', error.message);
        const statusCode = error.code === 'MODULE_LOCKED' ? 403 : 400;
        res.status(statusCode).json({
            success: false,
            error: error.message,
            unlockAt: error.unlockAt ?? null,
        });
    }
};

export const getManifest = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('[SCORM CONTROLLER] Manifest request for package:', id);

        const manifest = await ScormService.getManifest(id);

        res.json({
            success: true,
            data: manifest
        });

    } catch (error) {
        console.error('[SCORM CONTROLLER MANIFEST ERROR]', error.message);
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
};

export const getPackage = async (req, res) => {
    try {
        const { id } = req.params;
        const packageData = await ScormService.getPackage(id);

        res.json({
            success: true,
            data: packageData
        });

    } catch (error) {
        console.error('[SCORM CONTROLLER GET ERROR]', error.message);
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
};

export const getPackages = async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const packages = await ScormService.getPackages({
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            data: packages,
            meta: {
                count: packages.length,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });

    } catch (error) {
        console.error('[SCORM CONTROLLER LIST ERROR]', error.message);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

export const deletePackage = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('[SCORM CONTROLLER] Delete request for package:', id);

        await ScormService.deletePackage(id, req.user.id);

        res.json({
            success: true,
            message: 'SCORM package deleted successfully'
        });

    } catch (error) {
        console.error('[SCORM CONTROLLER DELETE ERROR]', error.message);

        const statusCode = error.message.includes('not found') ? 404 :
            error.message.includes('permission') ? 403 : 400;

        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
};

export const testConnection = async (req, res) => {
    try {
        const result = await ScormService.testScormCloudConnection();

        res.json({
            success: result.success,
            message: result.message,
            details: result.error ? { error: result.error } : null
        });

    } catch (error) {
        console.error('[SCORM CONTROLLER TEST ERROR]', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export const getUserScormScore = async (req, res) => {
    try {
        const userId = req.user.id;

        const attempts = await prisma.scormAttempt.findMany({
            where: { userId },
            select: {
                id: true,
                scormPackageId: true,
                scormCloudRegistrationId: true,
                completionPercentage: true,
                score: true,
                scormCloudScoreScaled: true,
                updatedAt: true,
                scormPackage: {
                    select: {
                        filename: true  // use this as display name
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        if (attempts.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: 'No SCORM attempts found for this user'
            });
        }

        // Enrich with SCORM Cloud score (with fallback)
        const enriched = await Promise.all(
            attempts.map(async (attempt) => {
                const result = {
                    ...attempt,
                    displayTitle: attempt.scormPackage.filename.replace('.zip', ''), // clean name
                    cloudScore: null,
                    lastSync: attempt.updatedAt
                };

                if (!attempt.scormCloudRegistrationId) {
                    result.cloudScoreError = 'No registration ID';
                    return result;
                }

                try {
                    const cloudData = await ScormCloudService.getRegistrationScore(
                        attempt.scormCloudRegistrationId
                    );

                    result.cloudScore = cloudData;
                    result.scorePercent = computeScorePercent(
                        cloudData.raw ?? attempt.score,
                        cloudData.scaled ?? attempt.scormCloudScoreScaled,
                        cloudData.max ?? 100,
                        cloudData.min ?? 0,
                    );
                    result.lastSync = new Date(); // mark as freshly synced
                } catch (err) {
                    console.warn(`[SCORE FETCH FAIL] Reg ${attempt.scormCloudRegistrationId}:`, err.message);
                    result.cloudScoreError = 'Latest score unavailable (check SCORM Cloud permissions)';
                    // Fallback to last known local score
                    result.cloudScore = {
                        raw: attempt.score,
                        scaled: attempt.scormCloudScoreScaled
                    };
                    result.scorePercent = computeScorePercent(
                        attempt.score,
                        attempt.scormCloudScoreScaled,
                    );
                }

                return result;
            })
        );

        res.json({
            success: true,
            data: enriched
        });
    } catch (error) {
        console.error('[GET USER SCORM SCORE ERROR]', error);
        res.status(500).json({ success: false, error: error.message });
    }



};

export const syncAndGetUserScormProgress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.query; // optional filter

        // 1. Find all relevant ScormAttempts for the user
        const where = { userId };
        if (courseId) {
            // Optional: filter by course via linked Attempt
            where.attempt = { courseId };
        }

        const attempts = await prisma.scormAttempt.findMany({
            where,
            include: { scormPackage: true, attempt: true }
        });

        if (attempts.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: 'No SCORM activity found',
                aggregated: { totalCompletion: 0, averageScore: 0 }
            });
        }

        // 2. Sync each attempt from SCORM Cloud
        const syncedAttempts = await Promise.all(
            attempts.map(async (attempt) => {
                try {
                    return await AttemptService.syncScormProgress(attempt.id, req.user);
                } catch (err) {
                    console.warn(`Sync failed for attempt ${attempt.id}:`, err.message);
                    return attempt; // fallback to last known state
                }
            })
        );

        // 3. Optional: aggregate stats for dashboard
        const totalCompletion = syncedAttempts.reduce((sum, a) => sum + (a.completionPercentage || 0), 0);
        const avgCompletion = syncedAttempts.length > 0 ? totalCompletion / syncedAttempts.length : 0;
        const avgScore = syncedAttempts.reduce((sum, a) => sum + (a.score || a.scormCloudScoreScaled * 100 || 0), 0) / syncedAttempts.length || 0;

        res.json({
            success: true,
            data: syncedAttempts,
            aggregated: {
                totalCompletion: Math.round(avgCompletion),
                averageScore: Math.round(avgScore),
                totalPackages: syncedAttempts.length,
                completedPackages: syncedAttempts.filter(a => a.status === 'COMPLETED').length
            }
        });
    } catch (error) {
        console.error('[SYNC USER SCORM PROGRESS ERROR]', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
