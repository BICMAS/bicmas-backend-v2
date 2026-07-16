import { prisma } from '../utils/db.js';

export class AttemptModel {
    static async upsert(userId, courseId, data) {
        console.log('[ATTEMPT MODEL] Upsert for userId:', userId, 'courseId:', courseId);
        return prisma.attempt.upsert({
            where: { userId_courseId: { userId, courseId } },
            update: {
                status: data.status,
                completionPercentage: data.completionPercentage,
                notes: data.notes,
                updatedAt: new Date()
            },
            create: {
                userId,
                courseId,
                status: data.status,
                completionPercentage: data.completionPercentage,
                notes: data.notes
            },
            include: { user: true, course: true }
        });
    }

    static async findByUserId(userId) {
        return prisma.attempt.findMany({
            where: { userId },
            include: { course: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async findByUserAndCourse(userId, courseId) {
        return prisma.attempt.findUnique({
            where: { userId_courseId: { userId, courseId } }
        });
    }
}