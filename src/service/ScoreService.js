import { prisma } from '../utils/db.js';
import {
    buildScoreRecordFromAttempt,
    computeScorePercent,
} from '../utils/scormScore.js';
import { EconomyService } from './EconomyService.js';

export class ScoreService {
    static async getMyScores(userId) {
        const attempts = await prisma.scormAttempt.findMany({
            where: { userId },
            include: {
                scormPackage: { select: { id: true, filename: true } },
                attempt: {
                    select: {
                        courseId: true,
                        course: { select: { id: true, title: true } },
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        const scores = attempts.map((attempt) =>
            buildScoreRecordFromAttempt(
                attempt,
                attempt.scormPackage,
                attempt.attempt?.course ?? null,
            ),
        );

        const scored = scores.filter((item) => item.scorePercent != null);
        const averageScore = scored.length > 0
            ? Math.round(scored.reduce((sum, item) => sum + item.scorePercent, 0) / scored.length)
            : 0;

        return { scores, averageScore, totalAttempts: scores.length };
    }

    static async getOrgScores(orgId, { learnerId = null, limit = 100, offset = 0 } = {}) {
        const learnerWhere = {
            orgId,
            userRole: 'LEARNER',
            status: 'ACTIVE',
        };
        if (learnerId) learnerWhere.id = learnerId;

        const learners = await prisma.user.findMany({
            where: learnerWhere,
            select: {
                id: true,
                fullName: true,
                email: true,
                department: true,
            },
        });

        if (learners.length === 0) {
            return { scores: [], count: 0, meta: { total: 0, limit, offset } };
        }

        const learnerIds = learners.map((learner) => learner.id);
        const learnerMap = new Map(learners.map((learner) => [learner.id, learner]));

        const attempts = await prisma.scormAttempt.findMany({
            where: { userId: { in: learnerIds } },
            include: {
                scormPackage: { select: { id: true, filename: true } },
                attempt: {
                    select: {
                        courseId: true,
                        course: { select: { id: true, title: true } },
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        const scores = attempts.map((attempt) => {
            const learner = learnerMap.get(attempt.userId);
            const record = buildScoreRecordFromAttempt(
                attempt,
                attempt.scormPackage,
                attempt.attempt?.course ?? null,
            );

            return {
                ...record,
                learnerId: learner?.id ?? attempt.userId,
                learnerName: learner?.fullName ?? 'Unknown',
                learnerEmail: learner?.email ?? null,
                learnerDepartment: learner?.department ?? 'UNASSIGNED',
            };
        });

        const total = scores.length;
        const paginated = scores.slice(offset, offset + limit);

        return {
            scores: paginated,
            count: paginated.length,
            meta: { total, limit, offset },
        };
    }

    static async getLeaderboard({
        metric = 'points',
        orgId = null,
        limit = 10,
    } = {}) {
        const rules = await EconomyService.getRules();
        if (!rules.enableLeaderboard) {
            return { enabled: false, metric, entries: [] };
        }

        const where = { userRole: 'LEARNER', status: 'ACTIVE' };
        if (orgId) where.orgId = orgId;

        if (metric === 'points') {
            const learners = await prisma.user.findMany({
                where,
                orderBy: { points: 'desc' },
                take: limit,
                select: {
                    id: true,
                    fullName: true,
                    department: true,
                    points: true,
                },
            });

            return {
                enabled: true,
                metric,
                entries: learners.map((learner, index) => ({
                    rank: index + 1,
                    id: learner.id,
                    name: learner.fullName,
                    department: learner.department,
                    value: learner.points,
                    label: `${learner.points} B$`,
                })),
            };
        }

        const learners = await prisma.user.findMany({
            where,
            select: {
                id: true,
                fullName: true,
                department: true,
                points: true,
                userAttempts: {
                    select: { completionPercentage: true, status: true },
                },
                scormAttempts: {
                    select: { score: true, scormCloudScoreScaled: true, completionPercentage: true },
                },
            },
        });

        const ranked = learners
            .map((learner) => {
                if (metric === 'score') {
                    const percents = learner.scormAttempts
                        .map((attempt) => computeScorePercent(attempt.score, attempt.scormCloudScoreScaled))
                        .filter((value) => value != null);
                    const value = percents.length > 0
                        ? Math.round(percents.reduce((sum, item) => sum + item, 0) / percents.length)
                        : 0;
                    return { ...learner, value };
                }

                const completions = learner.scormAttempts.length > 0
                    ? learner.scormAttempts
                    : learner.userAttempts;
                const value = completions.length > 0
                    ? Math.round(
                        completions.reduce((sum, item) => sum + (item.completionPercentage || 0), 0)
                            / completions.length,
                    )
                    : 0;
                return { ...learner, value };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, limit);

        return {
            enabled: true,
            metric,
            entries: ranked.map((learner, index) => ({
                rank: index + 1,
                id: learner.id,
                name: learner.fullName,
                department: learner.department,
                value: learner.value,
                points: learner.points,
                label: metric === 'score' ? `${learner.value}%` : `${learner.value}%`,
            })),
        };
    }
}
