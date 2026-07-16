import { CertificateTemplateModel } from '../models/CertificateTemplateModel.js';
import { CertificateModel } from '../models/CertificateModel.js';
import { CourseModel } from '../models/CourseModel.js';
import { UserModel } from '../models/UserModel.js';
import { AssignmentModel } from '../models/AssignmentModel.js';
import { AttemptModel } from '../models/AttemptModel.js';
import { getAssignmentCompletionState } from '../lib/courseCompletion.js';
import { CertificatePdfService, serializeTemplateMetadata } from './CertificatePdfService.js';
import { StorageService } from '../services/StorageService.js';

const ALLOWED_LOGO_MIME_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
]);

export class CertificateTemplateService {
    static async uploadTemplate(filePath, filename, mimeType, description, themeConfig, uploadedBy) {
        if (!uploadedBy) throw new Error('Uploader ID required');
        if (!filename) throw new Error('Filename required');

        const normalizedMime = String(mimeType || '').toLowerCase();
        const lowerName = filename.toLowerCase();
        const isAllowedMime = ALLOWED_LOGO_MIME_TYPES.has(normalizedMime);
        const isAllowedExt = ['.png', '.jpg', '.jpeg', '.webp'].some((ext) =>
            lowerName.endsWith(ext)
        );

        if (!isAllowedMime && !isAllowedExt) {
            throw new Error('Only PNG, JPG, or WEBP logo files are allowed');
        }

        const metadata = serializeTemplateMetadata(description, themeConfig);

        const result = await CertificateTemplateModel.uploadAndSave(
            filePath,
            filename,
            mimeType,
            metadata,
            uploadedBy
        );
        return result;
    }

    static async getTemplateById(id) {
        if (!id) throw new Error('Template ID required');
        const template = await CertificateTemplateModel.findById(id);
        if (!template) throw new Error('Certificate template not found');
        return template;
    }

    static async getLatestTemplate() {
        const template = await CertificateTemplateModel.findLatest();
        if (!template) throw new Error('No certificate templates found');
        return template;
    }

    static async assignTemplateToCourse(courseId, templateId, actorId, requester) {
        if (!courseId) throw new Error('Course ID required');
        if (!templateId) throw new Error('Template ID required');
        if (!actorId) throw new Error('Actor ID required');

        const [course, template] = await Promise.all([
            CourseModel.findById(courseId),
            CertificateTemplateModel.findById(templateId)
        ]);

        if (!course) throw new Error('Course not found');
        if (!template) throw new Error('Certificate template not found');

        if (requester?.userRole === 'HR_MANAGER') {
            if (!requester.orgId) throw new Error('HR must be in an organization');
            const assignedTemplateId = await CertificateModel.getAssignedTemplateForHR(requester.orgId, actorId);
            if (!assignedTemplateId) throw new Error('No certificate template assigned to HR manager');
            if (assignedTemplateId !== templateId) {
                throw new Error('HR manager can only assign their allocated certificate template');
            }
        }

        await CertificateModel.assignTemplateToCourse({ courseId, templateId, actorId });

        const reissueResult = await CertificateTemplateService.reissueCertificatesForCourse(
            courseId,
            actorId,
        );

        return { courseId, templateId, ...reissueResult };
    }

    static async assignTemplateToHRManager({ templateId, orgId, hrManagerId, actorId }) {
        if (!templateId) throw new Error('Template ID required');
        if (!orgId) throw new Error('Organization ID required');
        if (!hrManagerId) throw new Error('HR Manager ID required');
        if (!actorId) throw new Error('Actor ID required');

        const [template, hrManager] = await Promise.all([
            CertificateTemplateModel.findById(templateId),
            UserModel.findById(hrManagerId)
        ]);

        if (!template) throw new Error('Certificate template not found');
        if (!hrManager) throw new Error('HR manager not found');
        if (hrManager.userRole !== 'HR_MANAGER') throw new Error('User must be an HR manager');
        if (hrManager.orgId !== orgId) throw new Error('HR manager does not belong to the provided organization');

        await CertificateModel.assignTemplateToOrgHR({ orgId, hrManagerId, templateId, actorId });

        const reissueResult = await CertificateTemplateService.reissueCertificatesForOrg(
            orgId,
            actorId,
        );

        return { templateId, orgId, hrManagerId, ...reissueResult };
    }

    static async getAssignedTemplateForHRManager(hrManagerId, orgId) {
        if (!hrManagerId) throw new Error('HR Manager ID required');
        if (!orgId) throw new Error('HR must be in an organization');

        const templateId = await CertificateModel.getAssignedTemplateForHR(orgId, hrManagerId);
        if (!templateId) throw new Error('No certificate template assigned to this HR manager');

        const template = await CertificateTemplateModel.findById(templateId);
        if (!template) throw new Error('Certificate template not found');

        return {
            orgId,
            hrManagerId,
            templateId,
            template
        };
    }

    static async getAssignedTemplateForCourse(courseId) {
        if (!courseId) throw new Error('Course ID required');

        const course = await CourseModel.findById(courseId);
        if (!course) throw new Error('Course not found');

        const templateId = await CertificateModel.getAssignedTemplateForCourse(courseId);
        if (!templateId) throw new Error('No template assigned to course');

        const template = await CertificateTemplateModel.findById(templateId);
        if (!template) throw new Error('Certificate template not found');

        return {
            courseId,
            templateId,
            template
        };
    }

    static async formatCertificateForClient(certificate) {
        if (!certificate) return null;

        const certificateUrl = await StorageService.resolveStorageUrl(certificate.pdfPath);

        return {
            ...certificate,
            certificateUrl,
            pdfPath: certificateUrl || certificate.pdfPath,
        };
    }

    static async resolveTemplateIdForIssuance({ courseId, templateId, user }) {
        if (templateId) return templateId;

        const courseTemplateId = await CertificateModel.getAssignedTemplateForCourse(courseId);
        if (courseTemplateId) return courseTemplateId;

        if (user?.orgId) {
            const orgTemplateId = await CertificateModel.getAssignedTemplateForOrg(user.orgId);
            if (orgTemplateId) return orgTemplateId;
        }

        return null;
    }

    static async reissueCertificate({ certificate, user, course, templateId, issuerId }) {
        if (!certificate) throw new Error('Certificate not found');
        if (!user) throw new Error('User not found');
        if (!course) throw new Error('Course not found');

        const resolvedTemplateId = templateId ?? await CertificateTemplateService.resolveTemplateIdForIssuance({
            courseId: course.id,
            user,
        });
        if (!resolvedTemplateId) {
            throw new Error('No certificate template assigned to this course or organization');
        }

        const template = await CertificateTemplateModel.findById(resolvedTemplateId);
        if (!template) throw new Error('Certificate template not found');

        const generatedPdf = await CertificatePdfService.generateAndUpload({
            template,
            traineeName: user.fullName,
            courseTitle: course.title,
            issuedAt: certificate.issuedAt || new Date(),
        });

        const updated = await CertificateModel.updateCertificate(certificate.id, {
            templateId: resolvedTemplateId,
            pdfPath: generatedPdf.blobUrl,
        });

        return {
            ...(await CertificateTemplateService.formatCertificateForClient(updated)),
            issuedBy: issuerId,
        };
    }

    static async ensureCertificateCurrent({ learnerId, courseId, issuerId }) {
        const existing = await CertificateModel.findCertificateByUserAndCourse(learnerId, courseId);
        if (!existing) {
            return { certificate: null, reissued: false };
        }

        const [user, course] = await Promise.all([
            UserModel.findById(learnerId),
            CourseModel.findById(courseId),
        ]);
        if (!user) throw new Error('User not found');
        if (!course) throw new Error('Course not found');

        const resolvedTemplateId = await CertificateTemplateService.resolveTemplateIdForIssuance({
            courseId,
            user,
        });
        if (!resolvedTemplateId) {
            return {
                certificate: await CertificateTemplateService.formatCertificateForClient(existing),
                reissued: false,
            };
        }

        if (existing.templateId === resolvedTemplateId) {
            return {
                certificate: await CertificateTemplateService.formatCertificateForClient(existing),
                reissued: false,
            };
        }

        const reissued = await CertificateTemplateService.reissueCertificate({
            certificate: existing,
            user,
            course,
            templateId: resolvedTemplateId,
            issuerId,
        });

        return { certificate: reissued, reissued: true };
    }

    static async reissueCertificatesForOrg(orgId, actorId) {
        if (!orgId) throw new Error('Organization ID required');

        const certificates = await CertificateModel.findCertificatesByOrgId(orgId);
        let reissuedCount = 0;
        const errors = [];

        for (const certificate of certificates) {
            try {
                const resolvedTemplateId = await CertificateTemplateService.resolveTemplateIdForIssuance({
                    courseId: certificate.courseId,
                    user: certificate.user,
                });

                if (!resolvedTemplateId || certificate.templateId === resolvedTemplateId) {
                    continue;
                }

                await CertificateTemplateService.reissueCertificate({
                    certificate,
                    user: certificate.user,
                    course: certificate.course,
                    templateId: resolvedTemplateId,
                    issuerId: actorId,
                });
                reissuedCount += 1;
            } catch (error) {
                errors.push({
                    certificateId: certificate.id,
                    userId: certificate.userId,
                    courseId: certificate.courseId,
                    error: error.message,
                });
            }
        }

        return { reissuedCount, errors };
    }

    static async reissueCertificatesForCourse(courseId, actorId) {
        if (!courseId) throw new Error('Course ID required');

        const certificates = await CertificateModel.findCertificatesByCourseId(courseId);
        let reissuedCount = 0;
        const errors = [];

        for (const certificate of certificates) {
            try {
                const resolvedTemplateId = await CertificateTemplateService.resolveTemplateIdForIssuance({
                    courseId,
                    user: certificate.user,
                });

                if (!resolvedTemplateId || certificate.templateId === resolvedTemplateId) {
                    continue;
                }

                await CertificateTemplateService.reissueCertificate({
                    certificate,
                    user: certificate.user,
                    course: certificate.course,
                    templateId: resolvedTemplateId,
                    issuerId: actorId,
                });
                reissuedCount += 1;
            } catch (error) {
                errors.push({
                    certificateId: certificate.id,
                    userId: certificate.userId,
                    courseId: certificate.courseId,
                    error: error.message,
                });
            }
        }

        return { reissuedCount, errors };
    }

    static async issueCertificate({ userId, courseId, issuerId, templateId, requester }) {
        if (!userId) throw new Error('User ID required');
        if (!courseId) throw new Error('Course ID required');
        if (!issuerId) throw new Error('Issuer ID required');

        const [user, course] = await Promise.all([
            UserModel.findById(userId),
            CourseModel.findById(courseId)
        ]);
        if (!user) throw new Error('User not found');
        if (!course) throw new Error('Course not found');
        if (requester?.userRole === 'HR_MANAGER') {
            if (!requester.orgId) throw new Error('HR must be in an organization');
            if (user.orgId !== requester.orgId) {
                throw new Error('HR manager can only issue certificates to learners in their organization');
            }
        }

        const resolvedTemplateId = await CertificateTemplateService.resolveTemplateIdForIssuance({
            courseId,
            templateId,
            user,
        });
        if (!resolvedTemplateId) {
            throw new Error('No certificate template assigned to this course or organization');
        }

        const template = await CertificateTemplateModel.findById(resolvedTemplateId);
        if (!template) throw new Error('Certificate template not found');

        const existing = await CertificateModel.findCertificateByUserAndCourse(userId, courseId);
        if (existing) throw new Error('Certificate already issued for this user and course');

        const issuedAt = new Date();
        const generatedPdf = await CertificatePdfService.generateAndUpload({
            template,
            traineeName: user.fullName,
            courseTitle: course.title,
            issuedAt
        });

        const certificate = await CertificateModel.createCertificate({
            userId,
            courseId,
            templateId: resolvedTemplateId,
            pdfPath: generatedPdf.blobUrl,
            issuedAt
        });

        return {
            ...(await CertificateTemplateService.formatCertificateForClient(certificate)),
            issuedBy: issuerId,
        };
    }

    static async claimLearnerCertificate(learnerId, courseId) {
        if (!learnerId) throw new Error('Learner ID required');
        if (!courseId) throw new Error('Course ID required');

        const assignment = await AssignmentModel.findByCourseAndLearner(courseId, learnerId);
        if (!assignment) {
            throw new Error('Course not assigned to learner');
        }

        const attempt = await AttemptModel.findByUserAndCourse(learnerId, courseId);
        const completionState = await getAssignmentCompletionState(learnerId, courseId);
        if (!completionState.complete || !completionState.passed) {
            if (completionState.requiresRetake) {
                throw new Error(`Quiz not passed. Minimum score is ${completionState.passingScore}%. Please retake the course.`);
            }
            throw new Error('Course not yet completed');
        }

        const existing = await CertificateModel.findCertificateByUserAndCourse(learnerId, courseId);
        if (existing) {
            const current = await CertificateTemplateService.ensureCertificateCurrent({
                learnerId,
                courseId,
                issuerId: learnerId,
            });

            return {
                certificate: current.certificate,
                issued: false,
                reissued: current.reissued,
            };
        }

        const created = await this.issueCertificate({
            userId: learnerId,
            courseId,
            issuerId: learnerId,
            requester: { userRole: 'LEARNER' }
        });

        return { certificate: created, issued: true, reissued: false };
    }

    static async downloadLearnerCertificate(learnerId, courseId) {
        const claimResult = await this.claimLearnerCertificate(learnerId, courseId);
        const storedCertificate = await CertificateModel.findCertificateByUserAndCourse(
            learnerId,
            courseId,
        );

        if (!storedCertificate?.pdfPath) {
            throw new Error('Certificate file not found');
        }

        const fileBuffer = await StorageService.getObjectBuffer(storedCertificate.pdfPath);

        return {
            fileBuffer,
            filename: `certificate-${courseId}.pdf`,
            certificate: claimResult.certificate,
            issued: claimResult.issued,
        };
    }
}
