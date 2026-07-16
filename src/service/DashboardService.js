import { DashboardModel } from '../models/DashboardModel.js';
import { UserModel } from '../models/UserModel.js';
import { AttemptModel } from '../models/AttemptModel.js';
import { ScoreService } from './ScoreService.js';
import { prisma } from '../utils/db.js';
import { computeScorePercent } from '../utils/scormScore.js';

export class DashboardService {
    static async getHRDashboard(orgId) {
        console.log('[DASHBOARD SERVICE] Fetching for orgId:', orgId);
        const [totalLearners, averageCompletion, overdueCourses, activeAssignments, topPerformers, completionByDepartment, courseStatus, scoreLeaderboard, pointsLeaderboard] = await Promise.all([

            DashboardModel.getTotalLearners(orgId),
            DashboardModel.getAverageCompletion(orgId),
            DashboardModel.getOverdueCourses(orgId),
            DashboardModel.getActiveAssignments(orgId),
            DashboardModel.getTopPerformers(orgId),
            DashboardModel.getCompletionByDepartment(orgId),
            DashboardModel.getCourseStatus(orgId),
            ScoreService.getLeaderboard({ metric: 'score', orgId, limit: 5 }),
            ScoreService.getLeaderboard({ metric: 'points', orgId, limit: 5 }),
        ]);

        return {
            totalLearners,
            averageCompletion: Math.round(averageCompletion * 100) / 100,  // 2 decimals
            overdueCourses,
            activeAssignments,
            topPerformers,
            scoreLeaderboard,
            pointsLeaderboard,
            completionByDepartment,
            courseStatus
        };
    }

    static async getSuperAdminDashboard() {
        console.log('[DASHBOARD SERVICE SUPER] Fetching global dashboard');
        const [
            activeLearners,
            completionRate,
            averageSession,
            systemLoad,
            recentActivities,
            learningActivityGraph,
            recentActivity,
        ] = await Promise.all([
            DashboardModel.getActiveLearners(),
            DashboardModel.getCompletionRate(),
            DashboardModel.getAverageSession(),
            DashboardModel.getSystemLoad(),
            DashboardModel.getRecentActivities(),
            DashboardModel.getLearningActivityGraph(),
            DashboardModel.getRecentActivity(),
        ]);

        return {
            activeLearners,
            completionRate: Math.round(completionRate * 100) / 100,
            averageSession,
            systemLoad,
            recentActivities,
            learningActivityGraph,
            recentActivity,
        };
    }


}

export class LearnerDashboardService {
    static async getLearnerDashboard(user) {
        console.log('[LEARNER DASHBOARD SERVICE] For user ID:', user.id);
        const [streak, points, learningHours, coursesDone, averageScore, learningPaths, learningActivity, currentCourse, unfinishedCourses] = await Promise.all([
            DashboardModel.getLearnerStreak(user.id),
            DashboardModel.getLearnerPoints(user.id),
            DashboardModel.getLearnerHours(user.id),
            DashboardModel.getCoursesDone(user.id),
            DashboardModel.getAverageScore(user.id),
            DashboardModel.getLearnerPaths(user.id),
            DashboardModel.getLearningActivity(user.id),
            DashboardModel.getCurrentCourse(user.id),
            DashboardModel.getUnfinishedCourses(user.id)
        ]);

        return {
            streak,
            points,
            learningHours: Math.round(learningHours * 100) / 100,
            coursesDone,
            averageScore: Math.round(averageScore * 100) / 100,
            learningPaths,
            learningActivity,
            currentCourse,
            unfinishedCourses
        };
    }
}

export class HRCourseTrackingService {
    static normalizeQueryFilters(query = {}) {
        const search = typeof query.search === 'string' ? query.search.trim() : '';
        const department = typeof query.department === 'string' ? query.department.trim() : '';
        const status = typeof query.status === 'string' ? query.status.trim().toUpperCase() : '';
        const sortBy = typeof query.sortBy === 'string' ? query.sortBy.trim() : 'name';
        const sortOrder = typeof query.sortOrder === 'string' ? query.sortOrder.trim().toLowerCase() : 'asc';
        const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
        const offset = Math.max(parseInt(query.offset, 10) || 0, 0);

        return { search, department, status, sortBy, sortOrder, limit, offset };
    }

    static getProgressStatus({ attempts = [], stats = {} }) {
        if (!attempts.length) return 'NOT_STARTED';
        if ((stats.overdueCourses || 0) > 0) return 'OVERDUE';
        if ((stats.inProgressCourses || 0) > 0) return 'IN_PROGRESS';
        if ((stats.completedCourses || 0) > 0) return 'COMPLETED';
        return 'NOT_STARTED';
    }

    static matchesStatusFilter(item, statusFilter) {
        if (!statusFilter || statusFilter === 'ALL') return true;

        // Support filtering by user account status.
        if (['ACTIVE', 'INACTIVE', 'BLOCKED', 'DEACTIVATED'].includes(statusFilter)) {
            return item.learner?.status === statusFilter;
        }

        // Support filtering by learning progress status.
        const progressStatus = HRCourseTrackingService.getProgressStatus(item);
        return progressStatus === statusFilter;
    }

    static sortTrackingItems(items = [], sortBy = 'name', sortOrder = 'asc') {
        const direction = sortOrder === 'desc' ? -1 : 1;
        const normalizedSortBy = ['lastActiveAt', 'avgCompletion', 'name'].includes(sortBy) ? sortBy : 'name';

        return [...items].sort((a, b) => {
            if (normalizedSortBy === 'avgCompletion') {
                const av = Number(a?.stats?.avgCompletion || 0);
                const bv = Number(b?.stats?.avgCompletion || 0);
                return (av - bv) * direction;
            }

            if (normalizedSortBy === 'lastActiveAt') {
                const av = a?.stats?.lastActiveAt ? new Date(a.stats.lastActiveAt).getTime() : 0;
                const bv = b?.stats?.lastActiveAt ? new Date(b.stats.lastActiveAt).getTime() : 0;
                return (av - bv) * direction;
            }

            const an = String(a?.learner?.fullName || '').toLowerCase();
            const bn = String(b?.learner?.fullName || '').toLowerCase();
            if (an < bn) return -1 * direction;
            if (an > bn) return 1 * direction;
            return 0;
        });
    }

    static buildLearnerStats(attempts = [], unfinishedCourses = []) {
        const assignedCourses = unfinishedCourses.length;
        const completedAttempts = attempts.filter((a) => a.status === 'COMPLETED');
        const inProgressAttempts = attempts.filter((a) => a.status === 'IN_PROGRESS');
        const overdueAttempts = attempts.filter((a) => a.dueDate && a.dueDate < new Date() && a.status !== 'COMPLETED');

        const uniqueCompletedCourses = new Set(
            completedAttempts
                .map((a) => a.courseId)
                .filter(Boolean)
        ).size;

        const avgCompletionRaw = attempts.length > 0
            ? attempts.reduce((sum, a) => sum + (a.completionPercentage || 0), 0) / attempts.length
            : 0;

        const latestActivityDate = attempts.reduce((latest, attempt) => {
            const updatedAt = attempt?.updatedAt ? new Date(attempt.updatedAt) : null;
            if (!updatedAt) return latest;
            if (!latest) return updatedAt;
            return updatedAt > latest ? updatedAt : latest;
        }, null);

        return {
            assignedCourses,
            completedCourses: uniqueCompletedCourses,
            inProgressCourses: inProgressAttempts.length,
            overdueCourses: overdueAttempts.length,
            avgCompletion: Math.round(avgCompletionRaw * 100) / 100,
            lastActiveAt: latestActivityDate ? latestActivityDate.toISOString() : null
        };
    }

    static async getLearnerCourseTracking({ orgId }, learnerId) {
        if (!orgId) throw new Error('HR must be in an organization');
        if (!learnerId) throw new Error('Learner ID required');

        const learner = await UserModel.findById(learnerId);
        if (!learner) throw new Error('Learner not found');
        if (learner.orgId !== orgId) throw new Error('Access denied');

        // AttemptModel is course-level progress (one attempt per userId+courseId via upsert)
        const attempts = await AttemptModel.findByUserId(learnerId);

        const currentCourse = await DashboardModel.getCurrentCourse(learnerId);
        const unfinishedCourses = await DashboardModel.getUnfinishedCourses(learnerId);
        const stats = HRCourseTrackingService.buildLearnerStats(attempts, unfinishedCourses);

        return {
            learner: {
                id: learner.id,
                fullName: learner.fullName,
                email: learner.email,
                userRole: learner.userRole,
                status: learner.status,
                orgId: learner.orgId
            },
            attempts,
            currentCourse,
            unfinishedCourses,
            stats
        };
    }

    static async getAllLearnersCourseTracking({ orgId }, query = {}) {
        if (!orgId) throw new Error('HR must be in an organization');
        const { search, department, status, sortBy, sortOrder, limit, offset } = HRCourseTrackingService.normalizeQueryFilters(query);

        const learners = await UserModel.findLearnersByOrgId(orgId);
        if (!learners || learners.length === 0) {
            return {
                learners: [],
                count: 0,
                users: [],
                courses: [],
                progress: [],
                meta: { total: 0, limit, offset, pageCount: 0, filters: { search, department, status, sortBy, sortOrder } }
            };
        }

        const tracking = await Promise.all(
            learners.map(async (learner) => {
                const attempts = await AttemptModel.findByUserId(learner.id);
                const scormAttempts = await prisma.scormAttempt.findMany({
                    where: { userId: learner.id },
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
                const currentCourse = await DashboardModel.getCurrentCourse(learner.id);
                const unfinishedCourses = await DashboardModel.getUnfinishedCourses(learner.id);
                const stats = HRCourseTrackingService.buildLearnerStats(attempts, unfinishedCourses);
                const progressStatus = HRCourseTrackingService.getProgressStatus({ attempts, stats });

                return {
                    learner,
                    attempts,
                    scormAttempts,
                    currentCourse,
                    unfinishedCourses,
                    stats,
                    progressStatus
                };
            })
        );
        const filtered = tracking
            .filter((item) => {
                if (!department || department.toUpperCase() === 'ALL') return true;
                return String(item.learner.department || 'UNASSIGNED').toUpperCase() === department.toUpperCase();
            })
            .filter((item) => {
                if (!search) return true;
                const needle = search.toLowerCase();
                return item.learner.fullName?.toLowerCase().includes(needle) || item.learner.email?.toLowerCase().includes(needle);
            })
            .filter((item) => HRCourseTrackingService.matchesStatusFilter(item, status));

        const sorted = HRCourseTrackingService.sortTrackingItems(filtered, sortBy, sortOrder);
        const total = sorted.length;
        const paginated = sorted.slice(offset, offset + limit);

        const users = paginated.map((item) => item.learner);
        const courseMap = new Map();
        const progress = [];

        paginated.forEach((item) => {
            const pushProgressRow = (row) => {
                progress.push({
                    learnerId: item.learner.id,
                    learnerName: item.learner.fullName,
                    learnerEmail: item.learner.email,
                    learnerDepartment: item.learner.department || 'UNASSIGNED',
                    ...row,
                });
            };

            const scormAttempts = item.scormAttempts || [];

            if (scormAttempts.length > 0) {
                scormAttempts.forEach((scormAttempt) => {
                    const scorePercent = computeScorePercent(
                        scormAttempt.score,
                        scormAttempt.scormCloudScoreScaled,
                    );
                    pushProgressRow({
                        courseId: scormAttempt.attempt?.courseId || scormAttempt.scormPackageId,
                        courseTitle:
                            scormAttempt.attempt?.course?.title
                            || scormAttempt.scormPackage?.filename?.replace(/\.zip$/i, '')
                            || 'SCORM Module',
                        status: scormAttempt.status,
                        completionPercentage: scormAttempt.completionPercentage || 0,
                        score: scorePercent,
                        scoreRaw: scormAttempt.score,
                        passed: scormAttempt.status === 'PASSED' || scorePercent === 100,
                        dueDate: null,
                        syncedAt: scormAttempt.updatedAt || null,
                    });
                });
                return;
            }

            (item.attempts || []).forEach((attempt) => {
                if (attempt?.course?.id && !courseMap.has(attempt.course.id)) {
                    courseMap.set(attempt.course.id, attempt.course);
                }
                const scorePercent = computeScorePercent(attempt.score, attempt.scormCloudScoreScaled);
                pushProgressRow({
                    courseId: attempt.courseId || null,
                    courseTitle: attempt.course?.title || null,
                    status: attempt.status,
                    completionPercentage: attempt.completionPercentage || 0,
                    score: scorePercent ?? attempt.score ?? null,
                    scoreRaw: attempt.score ?? null,
                    passed: attempt.status === 'PASSED' || scorePercent === 100,
                    dueDate: attempt.dueDate || null,
                    syncedAt: attempt.updatedAt || null,
                });
            });
        });

        return {
            learners: paginated,
            count: paginated.length,
            users,
            courses: Array.from(courseMap.values()),
            progress,
            meta: {
                total,
                limit,
                offset,
                pageCount: Math.ceil(total / limit),
                filters: { search, department, status, sortBy, sortOrder }
            }
        };
    }
}