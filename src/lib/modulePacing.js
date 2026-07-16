import { prisma } from '../utils/db.js';
import { ScormCloudService } from '../services/ScormCloudService.js';
import { computeScorePercent } from '../utils/scormScore.js';
import { evaluateScormOutcome } from './coursePassing.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function sortModules(modules = []) {
    return [...modules].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

export function getModuleUnlockDate(pacingStartDate, moduleIndex, pacingDays = 7) {
    if (!pacingStartDate) return null;
    const anchor = new Date(pacingStartDate).getTime();
    return new Date(anchor + moduleIndex * pacingDays * MS_PER_DAY);
}

export function isModuleUnlockedByCalendar(course, moduleIndex, now = Date.now()) {
    if (!course?.modulePacingEnabled || !course?.pacingStartDate) {
        return true;
    }

    const unlockAt = getModuleUnlockDate(
        course.pacingStartDate,
        moduleIndex,
        course.modulePacingDays ?? 7,
    );
    return unlockAt != null && now >= unlockAt.getTime();
}

async function resolveCourseScormPackage(course) {
    if (course.scormPackageId && course.scormPackage) {
        return course.scormPackage;
    }

    const lessonPackageId = course.modules
        ?.flatMap((module) => module.lessons ?? [])
        ?.find((lesson) => lesson.scormPackageId)?.scormPackageId;

    if (!lessonPackageId) return null;

    return prisma.scormPackage.findUnique({
        where: { id: lessonPackageId },
    });
}

export async function linkModulesToManifestActivities(courseId) {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            modules: { include: { lessons: true } },
            scormPackage: true,
        },
    });

    if (!course) return;

    const scormPackage = await resolveCourseScormPackage(course);
    if (!scormPackage) return;

    const activities = scormPackage.manifestJson?.activities;
    if (!Array.isArray(activities) || activities.length === 0) return;

    const modules = sortModules(course.modules);
    const updates = modules
        .map((module, index) => {
            const activity = activities[index];
            if (!activity?.identifier) return null;
            return prisma.module.update({
                where: { id: module.id },
                data: {
                    sortOrder: index,
                    scormActivityId: activity.identifier,
                },
            });
        })
        .filter(Boolean);

    await Promise.all(updates);
}

async function ensureLearnerModuleProgress(userId, courseId, modules, course) {
    const sorted = sortModules(modules);
    const existing = await prisma.learnerModuleProgress.findMany({
        where: { userId, courseId },
    });
    const byModuleId = new Map(existing.map((row) => [row.moduleId, row]));

    for (let index = 0; index < sorted.length; index += 1) {
        const module = sorted[index];
        const calendarUnlocked = isModuleUnlockedByCalendar(course, index);
        const unlockAt = getModuleUnlockDate(
            course.pacingStartDate,
            index,
            course.modulePacingDays ?? 7,
        );

        const current = byModuleId.get(module.id);
        if (current) {
            if (calendarUnlocked && current.status === 'LOCKED') {
                await prisma.learnerModuleProgress.update({
                    where: { id: current.id },
                    data: {
                        status: 'UNLOCKED',
                        unlockedAt: unlockAt ?? new Date(),
                        scormActivityId: module.scormActivityId ?? current.scormActivityId,
                    },
                });
            }
            continue;
        }

        await prisma.learnerModuleProgress.create({
            data: {
                userId,
                courseId,
                moduleId: module.id,
                scormActivityId: module.scormActivityId ?? null,
                status: calendarUnlocked ? 'UNLOCKED' : 'LOCKED',
                unlockedAt: calendarUnlocked ? (unlockAt ?? new Date()) : null,
            },
        });
    }

    return prisma.learnerModuleProgress.findMany({
        where: { userId, courseId },
    });
}

export async function getModuleAccessForUser(userId, courseId, now = Date.now()) {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            modules: true,
            scormPackage: true,
        },
    });

    if (!course) throw new Error('Course not found');

    const sortedModules = sortModules(course.modules);
    await ensureLearnerModuleProgress(userId, courseId, sortedModules, course);

    const progressRecords = await prisma.learnerModuleProgress.findMany({
        where: { userId, courseId },
    });
    const progressByModuleId = new Map(progressRecords.map((row) => [row.moduleId, row]));

    const pacingEnabled = Boolean(course.modulePacingEnabled && course.pacingStartDate);
    const pacingDays = course.modulePacingDays ?? 7;

    const modules = sortedModules.map((module, index) => {
        const unlockAt = pacingEnabled
            ? getModuleUnlockDate(course.pacingStartDate, index, pacingDays)
            : null;
        const calendarUnlocked = isModuleUnlockedByCalendar(course, index, now);
        const progress = progressByModuleId.get(module.id);

        let status = progress?.status ?? (calendarUnlocked ? 'UNLOCKED' : 'LOCKED');
        if (!calendarUnlocked) {
            status = 'LOCKED';
        }

        return {
            moduleId: module.id,
            name: module.name,
            sortOrder: module.sortOrder,
            scormActivityId: module.scormActivityId,
            index,
            unlocked: calendarUnlocked,
            unlockAt: unlockAt?.toISOString() ?? null,
            status,
            completionPercentage: progress?.completionPercentage ?? 0,
            scorePercent: progress?.scorePercent ?? null,
            completedAt: progress?.completedAt?.toISOString() ?? null,
        };
    });

    return {
        courseId,
        scormPackageId: course.scormPackageId,
        modulePacingEnabled: Boolean(course.modulePacingEnabled),
        pacingStartDate: course.pacingStartDate?.toISOString() ?? null,
        modulePacingDays: pacingDays,
        modules,
    };
}

export async function assertModuleUnlocked(userId, courseId, moduleId, now = Date.now()) {
    const access = await getModuleAccessForUser(userId, courseId, now);
    const target = access.modules.find((module) => module.moduleId === moduleId);

    if (!target) {
        throw new Error('Module not found in course');
    }

    if (!target.unlocked) {
        const unlockLabel = target.unlockAt
            ? new Date(target.unlockAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            })
            : 'later';
        const err = new Error(`This module unlocks on ${unlockLabel}`);
        err.code = 'MODULE_LOCKED';
        err.unlockAt = target.unlockAt;
        throw err;
    }

    return target;
}

function mapChildActivityStatus(activity, passingConfig) {
    const completion = activity?.activityCompletion ?? activity?.completion ?? null;
    const success = activity?.activitySuccess ?? activity?.success ?? null;
    const scoreScaled = activity?.score?.scaled ?? activity?.activityScore?.scaled ?? null;
    const scoreRaw = activity?.score?.raw ?? activity?.activityScore?.raw ?? null;
    const scorePercent = computeScorePercent(scoreRaw, scoreScaled);

    let completionPercentage = 0;
    if (completion === 'COMPLETED' || completion === 'complete') {
        completionPercentage = 100;
    } else if (typeof activity?.progress === 'number') {
        completionPercentage = Math.round(activity.progress * 100);
    }

    const outcome = evaluateScormOutcome({
        completionPercentage,
        scorePercent,
        scormStatus: success === 'PASSED' || success === 'passed'
            ? 'PASSED'
            : success === 'FAILED' || success === 'failed'
                ? 'FAILED'
                : completion === 'COMPLETED'
                    ? 'COMPLETED'
                    : 'IN_PROGRESS',
        passingScore: passingConfig.passingScore,
        requireQuizPass: passingConfig.requireQuizPass,
    });

    return {
        completionPercentage,
        scorePercent,
        status: outcome.status === 'COMPLETED' || outcome.status === 'PASSED'
            ? 'COMPLETED'
            : outcome.status === 'FAILED'
                ? 'FAILED'
                : completionPercentage > 0
                    ? 'IN_PROGRESS'
                    : 'UNLOCKED',
        passed: outcome.passed,
    };
}

export async function syncLearnerModuleProgressFromRegistration({
    userId,
    courseId,
    registrationId,
    passingConfig,
}) {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: { modules: true },
    });

    if (!course?.modulePacingEnabled) return;

    const progressPayload = await ScormCloudService.getRegistrationProgress(
        registrationId,
        { includeChildResults: true },
    );

    const childActivities = progressPayload?.activityDetails
        ?? progressPayload?.activities
        ?? progressPayload?.childActivities
        ?? [];

    const modules = sortModules(course.modules);
    const activityById = new Map(
        childActivities
            .filter((activity) => activity?.id || activity?.activityId)
            .map((activity) => [activity.id ?? activity.activityId, activity]),
    );

    for (const module of modules) {
        if (!module.scormActivityId) continue;

        const activity = activityById.get(module.scormActivityId);
        if (!activity) continue;

        const mapped = mapChildActivityStatus(activity, passingConfig);
        const existing = await prisma.learnerModuleProgress.findUnique({
            where: {
                userId_moduleId: { userId, moduleId: module.id },
            },
        });

        if (!existing) continue;
        if (existing.status === 'LOCKED') continue;

        await prisma.learnerModuleProgress.update({
            where: { id: existing.id },
            data: {
                scormActivityId: module.scormActivityId,
                status: mapped.status,
                completionPercentage: mapped.completionPercentage,
                scorePercent: mapped.scorePercent,
                completedAt: mapped.status === 'COMPLETED' ? new Date() : existing.completedAt,
                updatedAt: new Date(),
            },
        });
    }
}

export async function resolveStartScoForModule(moduleId) {
    const module = await prisma.module.findUnique({
        where: { id: moduleId },
        select: { scormActivityId: true, sortOrder: true, courseId: true },
    });

    if (!module) return null;
    if (module.scormActivityId) return module.scormActivityId;

    const course = await prisma.course.findUnique({
        where: { id: module.courseId },
        include: { scormPackage: true, modules: true },
    });

    const activities = course?.scormPackage?.manifestJson?.activities;
    if (!Array.isArray(activities) || activities.length === 0) return null;

    const modules = sortModules(course.modules);
    const index = modules.findIndex((item) => item.id === moduleId);
    if (index < 0) return null;

    return activities[index]?.identifier ?? null;
}
