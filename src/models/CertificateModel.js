import crypto from 'crypto';
import { prisma } from '../utils/db.js';

const COURSE_TEMPLATE_EVENT = 'COURSE_TEMPLATE_ASSIGNED';
const ORG_TEMPLATE_EVENT = 'ORG_CERT_TEMPLATE_ASSIGNED';

export class CertificateModel {
    static async findCertificateByUserAndCourse(userId, courseId) {
        return prisma.certificate.findUnique({
            where: { userId_courseId: { userId, courseId } }
        });
    }

    static async findCertificateById(id) {
        return prisma.certificate.findUnique({
            where: { id }
        });
    }

    static async findCertificatesByOrgId(orgId) {
        return prisma.certificate.findMany({
            where: { user: { orgId } },
            include: { user: true, course: true }
        });
    }

    static async findCertificatesByCourseId(courseId) {
        return prisma.certificate.findMany({
            where: { courseId },
            include: { user: true, course: true }
        });
    }

    static async updateCertificate(id, data) {
        return prisma.certificate.update({
            where: { id },
            data
        });
    }

    static async createCertificate({ userId, courseId, templateId, pdfPath, issuedAt }) {
        return prisma.certificate.create({
            data: {
                userId,
                courseId,
                templateId,
                pdfPath,
                issuedAt: issuedAt || new Date(),
                verificationHash: crypto.randomUUID()
            }
        });
    }

    static async assignTemplateToCourse({ courseId, templateId, actorId }) {
        const existing = await prisma.auditLog.findFirst({
            where: {
                eventType: COURSE_TEMPLATE_EVENT,
                targetType: 'COURSE',
                targetId: courseId
            },
            orderBy: { createdAt: 'desc' }
        });

        const payload = { courseId, templateId };
        if (existing) {
            return prisma.auditLog.update({
                where: { id: existing.id },
                data: { actorId, payload }
            });
        }

        return prisma.auditLog.create({
            data: {
                eventType: COURSE_TEMPLATE_EVENT,
                actorId,
                targetType: 'COURSE',
                targetId: courseId,
                payload
            }
        });
    }

    static async getAssignedTemplateForCourse(courseId) {
        const log = await prisma.auditLog.findFirst({
            where: {
                eventType: COURSE_TEMPLATE_EVENT,
                targetType: 'COURSE',
                targetId: courseId
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!log?.payload || typeof log.payload !== 'object') return null;
        return log.payload?.templateId || null;
    }

    static async assignTemplateToOrgHR({ orgId, hrManagerId, templateId, actorId }) {
        return prisma.auditLog.create({
            data: {
                eventType: ORG_TEMPLATE_EVENT,
                actorId,
                targetType: 'ORGANIZATION',
                targetId: orgId,
                payload: { orgId, hrManagerId, templateId }
            }
        });
    }

    static async getAssignedTemplateForHR(orgId, hrManagerId) {
        const logs = await prisma.auditLog.findMany({
            where: {
                eventType: ORG_TEMPLATE_EVENT,
                targetType: 'ORGANIZATION',
                targetId: orgId
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        const match = logs.find((log) => {
            const payload = log?.payload;
            return payload && typeof payload === 'object' && payload.hrManagerId === hrManagerId;
        });
        if (!match?.payload || typeof match.payload !== 'object') return null;
        return match.payload?.templateId || null;
    }

    static async getAssignedTemplateForOrg(orgId) {
        const log = await prisma.auditLog.findFirst({
            where: {
                eventType: ORG_TEMPLATE_EVENT,
                targetType: 'ORGANIZATION',
                targetId: orgId
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!log?.payload || typeof log.payload !== 'object') return null;
        return log.payload?.templateId || null;
    }
}
