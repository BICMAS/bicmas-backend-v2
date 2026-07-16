"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = _interopRequireDefault(require("express"));
var _crypto = _interopRequireDefault(require("crypto"));
var _db = require("../utils/db.js");
var _env = require("../config/env.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const scormCallbackRouter = _express.default.Router();
function verifyCallbackSecret(req) {
  const expected = process.env.SCORM_CALLBACK_SECRET;
  if (!expected) {
    return !(0, _env.isProductionEnv)();
  }
  const provided = req.headers['x-scorm-callback-secret'] || req.query.secret || req.body?.secret;
  if (!provided || typeof provided !== 'string') {
    return false;
  }
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return _crypto.default.timingSafeEqual(providedBuffer, expectedBuffer);
}
scormCallbackRouter.post('/', _express.default.urlencoded({
  extended: true
}), async (req, res) => {
  if (!verifyCallbackSecret(req)) {
    console.warn('[SCORM CALLBACK] Rejected: invalid or missing secret');
    return res.status(401).send('Unauthorized');
  }
  console.log('[SCORM CALLBACK] Received registration update');
  try {
    const {
      registration_id,
      course_id,
      score,
      completion_status,
      total_seconds,
      success_status
    } = req.body;
    if (!registration_id) {
      console.warn('[SCORM CALLBACK] Missing registration_id');
      return res.status(200).send('OK');
    }
    const scormPackage = await _db.prisma.scormPackage.findFirst({
      where: {
        scormCloudId: course_id
      }
    });
    if (!scormPackage) {
      console.warn('[SCORM CALLBACK] Package not found for course:', course_id);
      return res.status(200).send('OK');
    }
    const mapStatus = scormStatus => {
      switch (scormStatus?.toLowerCase()) {
        case 'passed':
          return 'PASSED';
        case 'completed':
          return 'COMPLETED';
        case 'failed':
          return 'FAILED';
        case 'incomplete':
          return 'INCOMPLETE';
        case 'browsed':
          return 'INCOMPLETE';
        default:
          return 'INCOMPLETE';
      }
    };
    const parsedScore = score ? parseFloat(score) : 0;
    const parsedLearningHours = total_seconds ? parseFloat(total_seconds) / 3600 : null;
    const mappedStatus = mapStatus(completion_status || success_status);
    const completion = parsedScore * 100;
    const existingScormAttempt = await _db.prisma.scormAttempt.findUnique({
      where: {
        scormCloudRegistrationId: registration_id
      },
      include: {
        attempt: {
          select: {
            id: true
          }
        }
      }
    });
    if (!existingScormAttempt) {
      console.warn('[SCORM CALLBACK] Unknown registration_id:', registration_id);
      return res.status(200).send('OK');
    }
    const learnerId = existingScormAttempt.userId;
    let courseAttemptId = existingScormAttempt.attemptId || null;
    if (!courseAttemptId) {
      const packageAttempt = await _db.prisma.attempt.upsert({
        where: {
          userId_scormPackageId: {
            userId: learnerId,
            scormPackageId: scormPackage.id
          }
        },
        update: {
          status: mappedStatus,
          completionPercentage: completion,
          score: parsedScore,
          learningHours: parsedLearningHours,
          updatedAt: new Date()
        },
        create: {
          userId: learnerId,
          scormPackageId: scormPackage.id,
          status: mappedStatus,
          completionPercentage: completion,
          score: parsedScore,
          learningHours: parsedLearningHours
        },
        select: {
          id: true
        }
      });
      courseAttemptId = packageAttempt.id;
    } else {
      await _db.prisma.attempt.update({
        where: {
          id: courseAttemptId
        },
        data: {
          status: mappedStatus,
          completionPercentage: completion,
          score: parsedScore,
          learningHours: parsedLearningHours,
          updatedAt: new Date()
        }
      });
    }
    await _db.prisma.scormAttempt.update({
      where: {
        id: existingScormAttempt.id
      },
      data: {
        attemptId: courseAttemptId,
        status: mappedStatus,
        completionPercentage: completion,
        score: parsedScore,
        learningHours: parsedLearningHours,
        scormCloudLastSyncAt: new Date(),
        scormCloudCompletion: completion / 100,
        scormCloudScoreScaled: parsedScore,
        updatedAt: new Date()
      }
    });
    console.log('[SCORM CALLBACK] Updated attempt for learner:', learnerId);
    res.status(200).send('OK');
  } catch (error) {
    console.error('[SCORM CALLBACK ERROR]', error);
    res.status(200).send('OK');
  }
});
var _default = exports.default = scormCallbackRouter;