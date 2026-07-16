import express from 'express';
import crypto from 'crypto';
import { prisma } from '../utils/db.js';
import { isProductionEnv } from '../config/env.js';
import { EconomyService } from '../service/EconomyService.js';
import { AttemptService } from '../service/AttemptService.js';
import { normalizeCallbackPayload } from '../utils/scormScore.js';
import {
    evaluateScormOutcome,
    getCoursePassingConfigByScormPackageId,
} from '../lib/coursePassing.js';

const scormCallbackRouter = express.Router();

function verifyCallbackSecret(req) {
    const expected = process.env.SCORM_CALLBACK_SECRET;
    if (!expected) {
        return !isProductionEnv();
    }

    const provided = req.headers['x-scorm-callback-secret']
        || req.query.secret
        || req.body?.secret;

    if (!provided || typeof provided !== 'string') {
        return false;
    }

    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);

    if (providedBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

scormCallbackRouter.post('/', express.urlencoded({ extended: true }), async (req, res) => {
    if (!verifyCallbackSecret(req)) {
        console.warn('[SCORM CALLBACK] Rejected: invalid or missing secret');
        return res.status(401).send('Unauthorized');
    }

    console.log('[SCORM CALLBACK] Received registration update');

    try {
        const {
            registration_id,
            course_id,
            total_seconds,
        } = req.body;

        if (!registration_id) {
            console.warn('[SCORM CALLBACK] Missing registration_id');
            return res.status(200).send('OK');
        }

        const scormPackage = await prisma.scormPackage.findFirst({
            where: { scormCloudId: course_id }
        });

        if (!scormPackage) {
            console.warn('[SCORM CALLBACK] Package not found for course:', course_id);
            return res.status(200).send('OK');
        }

        const existingScormAttempt = await prisma.scormAttempt.findUnique({
            where: { scormCloudRegistrationId: registration_id },
            include: { attempt: { select: { id: true } } }
        });

        if (!existingScormAttempt) {
            console.warn('[SCORM CALLBACK] Unknown registration_id:', registration_id);
            return res.status(200).send('OK');
        }

        const normalized = normalizeCallbackPayload(
            req.body,
            existingScormAttempt.completionPercentage ?? 0,
        );

        const passingConfig = await getCoursePassingConfigByScormPackageId(scormPackage.id);
        const outcome = evaluateScormOutcome({
            completionPercentage: normalized.completionPercentage,
            scorePercent: normalized.scorePercent,
            scormStatus: normalized.status,
            passingScore: passingConfig.passingScore,
            requireQuizPass: passingConfig.requireQuizPass,
        });

        const learnerId = existingScormAttempt.userId;
        const previousScormStatus = existingScormAttempt.status;
        let courseAttemptId = existingScormAttempt.attemptId || null;

        const attemptData = {
            status: outcome.status,
            completionPercentage: normalized.completionPercentage,
            score: normalized.scoreRaw,
            learningHours: normalized.learningHours,
            updatedAt: new Date(),
        };

        if (!courseAttemptId) {
            const packageAttempt = await prisma.attempt.upsert({
                where: {
                    userId_scormPackageId: {
                        userId: learnerId,
                        scormPackageId: scormPackage.id
                    }
                },
                update: attemptData,
                create: {
                    userId: learnerId,
                    scormPackageId: scormPackage.id,
                    ...attemptData,
                },
                select: { id: true }
            });
            courseAttemptId = packageAttempt.id;
        } else {
            await prisma.attempt.update({
                where: { id: courseAttemptId },
                data: attemptData,
            });
        }

        await prisma.scormAttempt.update({
            where: { id: existingScormAttempt.id },
            data: {
                attemptId: courseAttemptId,
                status: outcome.status,
                completionPercentage: normalized.completionPercentage,
                score: normalized.scoreRaw,
                learningHours: normalized.learningHours,
                scormCloudLastSyncAt: new Date(),
                scormCloudCompletion: normalized.scormCloudCompletion,
                scormCloudScoreScaled: normalized.scoreScaled,
                updatedAt: new Date()
            }
        });

        if (outcome.passed) {
            await EconomyService.onModuleCompleted(
                learnerId,
                scormPackage.id,
                previousScormStatus,
                outcome.status,
            );
        }

        if (outcome.passed && normalized.scorePercent === 100) {
            await EconomyService.onPerfectQuiz(learnerId, scormPackage.id);
        }

        if (courseAttemptId) {
            courseAttemptId = await AttemptService.ensureCourseAttemptLink(
                learnerId,
                scormPackage.id,
                courseAttemptId,
            );
            await AttemptService.rollUpCourseCompletion(courseAttemptId);
        }

        console.log('[SCORM CALLBACK] Updated attempt for learner:', learnerId);
        res.status(200).send('OK');
    } catch (error) {
        console.error('[SCORM CALLBACK ERROR]', error);
        res.status(200).send('OK');
    }
});

export default scormCallbackRouter;
