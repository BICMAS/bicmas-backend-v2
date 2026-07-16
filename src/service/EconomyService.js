import { prisma } from '../utils/db.js';
import { UserModel } from '../models/UserModel.js';

const COMPLETE_STATUSES = new Set(['COMPLETED', 'PASSED']);

const DEFAULT_RULES = {
    courseCompletion: 50,
    moduleCompletion: 10,
    perfectQuiz: 25,
    dailyStreak: 5,
    streakDaysRequired: 7,
    enableLeaderboard: true,
};

function isCompleteStatus(status) {
    return COMPLETE_STATUSES.has(status);
}

function becameComplete(previousStatus, newStatus) {
    return isCompleteStatus(newStatus) && !isCompleteStatus(previousStatus);
}

function toDateKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

function yesterdayDateKey() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return toDateKey(date);
}

export class EconomyService {
    static async getRules() {
        let config = await prisma.economyConfig.findUnique({ where: { id: 'default' } });

        if (!config) {
            config = await prisma.economyConfig.create({
                data: { id: 'default', ...DEFAULT_RULES },
            });
        }

        return {
            courseCompletion: config.courseCompletion,
            moduleCompletion: config.moduleCompletion,
            perfectQuiz: config.perfectQuiz,
            dailyStreak: config.dailyStreak,
            streakDaysRequired: config.streakDaysRequired,
            enableLeaderboard: config.enableLeaderboard,
            updatedAt: config.updatedAt,
        };
    }

    static async updateRules(updates, updatedBy) {
        const data = {};

        if (updates.courseCompletion !== undefined) {
            data.courseCompletion = Math.max(0, Number(updates.courseCompletion) || 0);
        }
        if (updates.moduleCompletion !== undefined) {
            data.moduleCompletion = Math.max(0, Number(updates.moduleCompletion) || 0);
        }
        if (updates.perfectQuiz !== undefined) {
            data.perfectQuiz = Math.max(0, Number(updates.perfectQuiz) || 0);
        }
        if (updates.dailyStreak !== undefined) {
            data.dailyStreak = Math.max(0, Number(updates.dailyStreak) || 0);
        }
        if (updates.streakDaysRequired !== undefined) {
            data.streakDaysRequired = Math.max(1, Number(updates.streakDaysRequired) || 7);
        }
        if (updates.enableLeaderboard !== undefined) {
            data.enableLeaderboard = Boolean(updates.enableLeaderboard);
        }

        const config = await prisma.economyConfig.upsert({
            where: { id: 'default' },
            update: { ...data, updatedBy },
            create: { id: 'default', ...DEFAULT_RULES, ...data, updatedBy },
        });

        return {
            courseCompletion: config.courseCompletion,
            moduleCompletion: config.moduleCompletion,
            perfectQuiz: config.perfectQuiz,
            dailyStreak: config.dailyStreak,
            streakDaysRequired: config.streakDaysRequired,
            enableLeaderboard: config.enableLeaderboard,
            updatedAt: config.updatedAt,
        };
    }

    static async getStats() {
        const [aggregate, rules] = await Promise.all([
            prisma.user.aggregate({
                where: { userRole: 'LEARNER', status: 'ACTIVE' },
                _sum: { points: true },
            }),
            EconomyService.getRules(),
        ]);

        return {
            totalCirculating: aggregate._sum.points || 0,
            enableLeaderboard: rules.enableLeaderboard,
        };
    }

    static async getLeaderboard(limit = 10) {
        const rules = await EconomyService.getRules();
        if (!rules.enableLeaderboard) return [];

        const learners = await prisma.user.findMany({
            where: { userRole: 'LEARNER', status: 'ACTIVE' },
            orderBy: { points: 'desc' },
            take: limit,
            select: { id: true, fullName: true, points: true },
        });

        return learners.map((learner, index) => ({
            rank: index + 1,
            id: learner.id,
            name: learner.fullName,
            coins: learner.points,
        }));
    }

    static async awardAutomatic(userId, awardType, referenceId, points) {
        if (!userId || !awardType || !referenceId || !points || points <= 0) {
            return null;
        }

        const learner = await UserModel.findById(userId);
        if (!learner || learner.userRole !== 'LEARNER' || learner.status !== 'ACTIVE') {
            return null;
        }

        try {
            await prisma.coinAward.create({
                data: {
                    userId,
                    awardType,
                    referenceId: String(referenceId),
                    points,
                },
            });
        } catch (error) {
            if (error.code === 'P2002') {
                return null;
            }
            throw error;
        }

        const updated = await UserModel.updatePoints(userId, points);
        console.log(`[ECONOMY] Awarded ${points} B$ to ${userId} for ${awardType} (${referenceId})`);
        return updated;
    }

    static async onCourseCompleted(userId, courseId, previousStatus, newStatus) {
        if (!courseId || !becameComplete(previousStatus, newStatus)) return null;

        const rules = await EconomyService.getRules();
        return EconomyService.awardAutomatic(
            userId,
            'COURSE_COMPLETION',
            courseId,
            rules.courseCompletion,
        );
    }

    static async onModuleCompleted(userId, scormPackageId, previousStatus, newStatus) {
        if (!scormPackageId || !becameComplete(previousStatus, newStatus)) return null;

        const rules = await EconomyService.getRules();
        return EconomyService.awardAutomatic(
            userId,
            'MODULE_COMPLETION',
            scormPackageId,
            rules.moduleCompletion,
        );
    }

    static async onPerfectQuiz(userId, quizId) {
        if (!quizId) return null;

        const rules = await EconomyService.getRules();
        return EconomyService.awardAutomatic(
            userId,
            'PERFECT_QUIZ',
            quizId,
            rules.perfectQuiz,
        );
    }

    static async processLoginStreak(userId) {
        const user = await UserModel.findById(userId);
        if (!user || user.userRole !== 'LEARNER' || user.status !== 'ACTIVE') {
            return null;
        }

        const rules = await EconomyService.getRules();
        const metadata = user.metadata && typeof user.metadata === 'object' && !Array.isArray(user.metadata)
            ? user.metadata
            : {};

        const today = toDateKey();
        const lastLoginDate = typeof metadata.lastLoginDate === 'string' ? metadata.lastLoginDate : null;

        if (lastLoginDate === today) {
            return null;
        }

        let loginStreak = typeof metadata.loginStreak === 'number' ? metadata.loginStreak : 0;

        if (lastLoginDate === yesterdayDateKey()) {
            loginStreak += 1;
        } else {
            loginStreak = 1;
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                streak: loginStreak,
                metadata: {
                    ...metadata,
                    lastLoginDate: today,
                    loginStreak,
                    lastLoginAt: new Date().toISOString(),
                },
            },
        });

        if (loginStreak > 0 && loginStreak % rules.streakDaysRequired === 0) {
            return EconomyService.awardAutomatic(
                userId,
                'DAILY_STREAK',
                `streak:${loginStreak}`,
                rules.dailyStreak,
            );
        }

        return null;
    }
}
