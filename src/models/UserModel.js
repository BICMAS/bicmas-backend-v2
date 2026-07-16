import { prisma } from '../utils/db.js';

export class UserModel {
    static async findByEmail(email) {
        return prisma.user.findUnique({ where: { email } });
    }

    static async findById(id) {
        return prisma.user.findUnique({ where: { id } });
    }

    static async update(id, updates) {
        return prisma.user.update({ where: { id }, data: updates });
    }

    static async deleteById(id) {
        return prisma.user.delete({ where: { id } });
    }

    static async findByPhone(phoneNumber) {
        return prisma.user.findUnique({ where: { phoneNumber } });
    }

    static async findAll(requesterRole, requesterOrgId = null) {
        const where = requesterRole === 'SUPER_ADMIN'
            ? {}
            : { orgId: requesterOrgId };
        return prisma.user.findMany({
            where,
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                userRole: true,
                status: true,
                orgId: true,
                department: true,
                phoneNumber: true,
                metadata: true,
            }
        });
    }

    static async recordLogin(userId, existingMetadata) {
        const base = existingMetadata && typeof existingMetadata === 'object' && !Array.isArray(existingMetadata)
            ? existingMetadata
            : {};
        return prisma.user.update({
            where: { id: userId },
            data: {
                metadata: {
                    ...base,
                    lastLoginAt: new Date().toISOString(),
                },
            },
        });
    }

    static async findMany() {
        return prisma.user.findMany({ select: { id: true, username: true, email: true, fullName: true, userRole: true, status: true } });
    }

    static async create(data) {
        return prisma.user.create({ data });
    }

    static async findManyByIds(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return [];
        return prisma.user.findMany({
            where: { id: { in: ids } },
            select: { id: true, fullName: true, email: true, userRole: true, orgId: true, status: true }
        });
    }

    static async findByOrgId(orgId) {
        console.log(`[MODEL] Finding users by orgId: ${orgId}`);
        return prisma.user.findMany({ where: { orgId } });
    }

    static async findLearnersByOrgId(orgId) {
        console.log(`[MODEL] Finding learners by orgId: ${orgId}`);
        return prisma.user.findMany({
            where: { orgId, userRole: 'LEARNER' },
            select: { id: true, fullName: true, email: true, userRole: true, status: true, orgId: true, department: true }
        });
    }

    static async bulkCreate(csvData) {
        return prisma.user.createMany({ data: csvData, skipDuplicates: true });
    }

    static async updatePoints(id, points) {
        return prisma.user.update({
            where: { id },
            data: { points: { increment: points } },
            select: { id: true, fullName: true, points: true, status: true, userRole: true }
        });
    }
}