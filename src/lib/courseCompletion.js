import { prisma } from '../utils/db.js';
import {
    evaluateScormOutcome,
    getCoursePassingConfigByCourseId,
    scoreFromAttemptFields,
} from './coursePassing.js';

export async function getCourseScormPackageIds(courseId) {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
            scormPackageId: true,
            modules: {
                select: {
                    lessons: {
                        select: { scormPackageId: true },
                    },
                },
            },
        },
    });

    if (!course) return [];

    const packageIds = new Set();
    if (course.scormPackageId) packageIds.add(course.scormPackageId);
    for (const module of course.modules) {
        for (const lesson of module.lessons) {
            if (lesson.scormPackageId) packageIds.add(lesson.scormPackageId);
        }
    }

    return [...packageIds];
}

function evaluateScormAttemptPassed(scormAttempt, passingConfig) {
    const scorePercent = scoreFromAttemptFields(
        scormAttempt.score,
        scormAttempt.scormCloudScoreScaled,
    );

    const outcome = evaluateScormOutcome({
        completionPercentage: scormAttempt.completionPercentage ?? 0,
        scorePercent,
        scormStatus: scormAttempt.status,
        passingScore: passingConfig.passingScore,
        requireQuizPass: passingConfig.requireQuizPass,
    });

    return outcome.passed;
}

export async function getAssignmentCompletionState(userId, courseId) {
    const passingConfig = await getCoursePassingConfigByCourseId(courseId);

    const courseAttempt = await prisma.attempt.findUnique({
        where: {
            userId_courseId: { userId, courseId },
        },
        select: {
            status: true,
            completionPercentage: true,
            score: true,
            scormCloudScoreScaled: true,
        },
    });

    if (courseAttempt?.status === 'FAILED') {
        return {
            complete: false,
            passed: false,
            progress: Math.round(courseAttempt.completionPercentage ?? 0),
            status: 'FAILED',
            requiresRetake: true,
            passingScore: passingConfig.passingScore,
            scorePercent: scoreFromAttemptFields(
                courseAttempt.score,
                courseAttempt.scormCloudScoreScaled,
            ),
        };
    }

    if (courseAttempt?.status === 'COMPLETED' || courseAttempt?.status === 'PASSED') {
        const scorePercent = scoreFromAttemptFields(
            courseAttempt.score,
            courseAttempt.scormCloudScoreScaled,
        );

        if (!passingConfig.requireQuizPass) {
            return {
                complete: true,
                passed: true,
                progress: 100,
                status: 'COMPLETED',
                requiresRetake: false,
                passingScore: passingConfig.passingScore,
                scorePercent,
            };
        }

        if (scorePercent != null && scorePercent >= passingConfig.passingScore) {
            return {
                complete: true,
                passed: true,
                progress: 100,
                status: 'COMPLETED',
                requiresRetake: false,
                passingScore: passingConfig.passingScore,
                scorePercent,
            };
        }
    }

    const packageIds = await getCourseScormPackageIds(courseId);
    if (packageIds.length === 0) {
        const progress = Math.round(courseAttempt?.completionPercentage ?? 0);
        return {
            complete: false,
            passed: false,
            progress,
            status: courseAttempt?.status ?? 'NOT_STARTED',
            requiresRetake: false,
            passingScore: passingConfig.passingScore,
            scorePercent: scoreFromAttemptFields(
                courseAttempt?.score,
                courseAttempt?.scormCloudScoreScaled,
            ),
        };
    }

    const scormAttempts = await prisma.scormAttempt.findMany({
        where: {
            userId,
            scormPackageId: { in: packageIds },
        },
        select: {
            completionPercentage: true,
            status: true,
            score: true,
            scormCloudScoreScaled: true,
        },
    });

    if (scormAttempts.length === 0) {
        const progress = Math.round(courseAttempt?.completionPercentage ?? 0);
        return {
            complete: false,
            passed: false,
            progress,
            status: courseAttempt?.status ?? 'NOT_STARTED',
            requiresRetake: false,
            passingScore: passingConfig.passingScore,
            scorePercent: null,
        };
    }

    const progress = Math.round(
        scormAttempts.reduce((sum, attempt) => sum + (attempt.completionPercentage ?? 0), 0)
            / scormAttempts.length,
    );

    const anyFailed = scormAttempts.some((attempt) => {
        const scorePercent = scoreFromAttemptFields(attempt.score, attempt.scormCloudScoreScaled);
        const outcome = evaluateScormOutcome({
            completionPercentage: attempt.completionPercentage ?? 0,
            scorePercent,
            scormStatus: attempt.status,
            passingScore: passingConfig.passingScore,
            requireQuizPass: passingConfig.requireQuizPass,
        });
        return outcome.status === 'FAILED';
    });

    if (anyFailed) {
        const failedScores = scormAttempts
            .map((attempt) => scoreFromAttemptFields(attempt.score, attempt.scormCloudScoreScaled))
            .filter((value) => value != null);
        const scorePercent = scoreFromAttemptFields(
            courseAttempt?.score,
            courseAttempt?.scormCloudScoreScaled,
        ) ?? (failedScores.length > 0
            ? Math.round(failedScores.reduce((sum, value) => sum + value, 0) / failedScores.length)
            : null);

        return {
            complete: false,
            passed: false,
            progress,
            status: 'FAILED',
            requiresRetake: true,
            passingScore: passingConfig.passingScore,
            scorePercent: scorePercent || null,
        };
    }

    const complete = scormAttempts.every((attempt) =>
        evaluateScormAttemptPassed(attempt, passingConfig),
    );

    const rolledScores = scormAttempts
        .map((attempt) => scoreFromAttemptFields(attempt.score, attempt.scormCloudScoreScaled))
        .filter((value) => value != null);
    const rolledScore = rolledScores.length > 0
        ? Math.round(rolledScores.reduce((sum, value) => sum + value, 0) / rolledScores.length)
        : null;

    return {
        complete,
        passed: complete,
        progress: complete ? 100 : progress,
        status: complete ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
        requiresRetake: false,
        passingScore: passingConfig.passingScore,
        scorePercent: rolledScore || null,
    };
}
