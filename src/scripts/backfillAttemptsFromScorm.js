import { prisma } from '../utils/db.js';

const APPLY_MODE = process.argv.includes('--apply');

function pickAttemptValues(scormAttempt) {
    return {
        status: scormAttempt.status || 'IN_PROGRESS',
        completionPercentage: scormAttempt.completionPercentage ?? 0,
        score: scormAttempt.score ?? null,
        learningHours: scormAttempt.learningHours ?? null
    };
}

async function main() {
    console.log(`[BACKFILL] Starting in ${APPLY_MODE ? 'APPLY' : 'DRY-RUN'} mode`);

    const scormAttempts = await prisma.scormAttempt.findMany({
        include: {
            attempt: { select: { id: true } }
        }
    });

    let missingLinkCount = 0;
    let createAttemptCount = 0;
    let relinkAttemptCount = 0;
    let updateAttemptCount = 0;

    for (const scormAttempt of scormAttempts) {
        const values = pickAttemptValues(scormAttempt);
        let attemptId = scormAttempt.attemptId;

        if (!attemptId) {
            missingLinkCount += 1;
        }

        // Prefer existing package-level attempt to avoid duplicates.
        let targetAttempt = await prisma.attempt.findFirst({
            where: {
                userId: scormAttempt.userId,
                scormPackageId: scormAttempt.scormPackageId
            },
            select: { id: true }
        });

        if (!targetAttempt && !scormAttempt.attemptId) {
            createAttemptCount += 1;
            if (APPLY_MODE) {
                targetAttempt = await prisma.attempt.create({
                    data: {
                        userId: scormAttempt.userId,
                        scormPackageId: scormAttempt.scormPackageId,
                        ...values
                    },
                    select: { id: true }
                });
            }
        }

        if (scormAttempt.attemptId) {
            targetAttempt = { id: scormAttempt.attemptId };
        }

        if (targetAttempt?.id && scormAttempt.attemptId !== targetAttempt.id) {
            relinkAttemptCount += 1;
            if (APPLY_MODE) {
                await prisma.scormAttempt.update({
                    where: { id: scormAttempt.id },
                    data: {
                        attemptId: targetAttempt.id,
                        updatedAt: new Date()
                    }
                });
            }
        }

        if (targetAttempt?.id) {
            updateAttemptCount += 1;
            if (APPLY_MODE) {
                await prisma.attempt.update({
                    where: { id: targetAttempt.id },
                    data: {
                        ...values,
                        updatedAt: new Date()
                    }
                });
            }
        }
    }

    console.log('[BACKFILL] Result:');
    console.log(`- scormAttempts scanned: ${scormAttempts.length}`);
    console.log(`- scormAttempts missing attemptId: ${missingLinkCount}`);
    console.log(`- attempts to create: ${createAttemptCount}`);
    console.log(`- scormAttempts to relink: ${relinkAttemptCount}`);
    console.log(`- attempts to refresh from scorm values: ${updateAttemptCount}`);
    console.log(`[BACKFILL] Completed in ${APPLY_MODE ? 'APPLY' : 'DRY-RUN'} mode`);
}

main()
    .catch((error) => {
        console.error('[BACKFILL ERROR]', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
