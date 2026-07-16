import { prisma } from '../utils/db.js';

export class LearningPathModel {
    static async create(data) {
        try {
            console.log('[LEARNING PATH MODEL] Creating path:', data.title);
            return await prisma.learningPath.create({
                data,
                include: { creator: true }
            });
        } catch (error) {
            console.error('[LEARNING PATH MODEL ERROR create]', error.message);
            throw new Error('Failed to create learning path');
        }
    }

    static async findMany(where = {}) {
        try {
            console.log('[LEARNING PATH MODEL] findMany where:', where);
            const paths = await prisma.learningPath.findMany({
                where,
                include: { creator: true },
                orderBy: { createdAt: 'desc' }
            });
            console.log('[LEARNING PATH MODEL] Returned', paths.length, 'paths');
            return paths;
        } catch (error) {
            console.error('[LEARNING PATH MODEL ERROR findMany]', error.message);
            throw new Error('Failed to fetch learning paths');
        }
    }

    static async findById(id) {
        if (!id || typeof id !== 'string') throw new Error('Invalid ID');
        try {
            console.log('[LEARNING PATH MODEL] findById:', id);
            return await prisma.learningPath.findUnique({
                where: { id },
                include: {
                    creator: true,
                    enrolments: {
                        include: {
                            user: { select: { id: true, fullName: true, email: true } }  // FIXED: Select specific fields for perf
                        }
                    }
                }
            });
        } catch (error) {
            console.error('[LEARNING PATH MODEL ERROR findById]', error.message);
            throw new Error('Failed to fetch learning path');
        }
    }

    static async update(id, data) {
        if (!id || typeof id !== 'string') throw new Error('Invalid ID');
        try {
            console.log('[LEARNING PATH MODEL] Updating path:', id);
            return await prisma.learningPath.update({
                where: { id },
                data,
                include: { creator: true }
            });
        } catch (error) {
            console.error('[LEARNING PATH MODEL ERROR update]', error.message);
            throw new Error('Failed to update learning path');
        }
    }

    static async enrolUser(learningPathId, userId) {
        if (!learningPathId || !userId || typeof learningPathId !== 'string' || typeof userId !== 'string') {
            throw new Error('Invalid learning path or user ID');
        }
        try {
            console.log('[LEARNING PATH MODEL] Enrolling userId:', userId, 'to pathId:', learningPathId);
            return await prisma.learningPathEnrolment.create({
                data: { learningPathId, userId },
                include: { learningPath: true, user: true }
            });
        } catch (error) {
            console.error('[LEARNING PATH MODEL ERROR enrolUser]', error.message);
            throw new Error('Failed to enrol user');
        }
    }

    // FIXED: Bonus method for curriculum validation (from earlier)
    static async validateCurriculumSequence(sequence) {
        if (!Array.isArray(sequence)) throw new Error('Sequence must be array');
        const courses = await prisma.course.findMany({
            where: { id: { in: sequence } },
            select: { id: true, status: true }
        });
        if (courses.length !== sequence.length) throw new Error('Some courses not found');
        if (courses.some(c => c.status !== 'PUBLISHED')) throw new Error('All courses must be published');
        return courses;
    }
}