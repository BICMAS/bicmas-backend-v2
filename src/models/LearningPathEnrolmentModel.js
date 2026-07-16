import { prisma } from '../utils/db.js';

export class LearningPathEnrolmentModel {
    static async findByUserAndCourse(userId, courseId) {
        console.log('[ENROLMENT MODEL] Finding enrolments for userId:', userId, 'courseId:', courseId);
        return prisma.learningPathEnrolment.findMany({
            where: {
                userId,
                learningPath: {
                    curriculumSequence: {
                        array_contains: courseId  // Matches course in JSON sequence
                    }
                }
            },
            include: { learningPath: true }
        });
    }

    static async updateProgress(enrolmentId, progress) {
        console.log('[ENROLMENT MODEL] Updating progress for enrolmentId:', enrolmentId, 'progress:', progress);
        return prisma.learningPathEnrolment.update({
            where: { id: enrolmentId },
            data: {
                progress,
                completedAt: progress === 100 ? new Date() : null
            },
            include: { learningPath: true, user: true }
        });
    }
}