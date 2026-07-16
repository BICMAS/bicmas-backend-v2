"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AttemptService = void 0;
var _db = require("../utils/db.js");
var _ScormCloudService = require("../services/ScormCloudService.js");
var _AttemptModel = require("../models/AttemptModel.js");
var _LearningPathEnrolmentModel = require("../models/LearningPathEnrolmentModel.js");
class AttemptService {
  // Your existing course-level update (unchanged)
  static async updateProgress(courseId, data, user) {
    if (user.userRole !== 'LEARNER') throw new Error('Only learners can update progress');
    if (data.completionPercentage < 0 || data.completionPercentage > 100) throw new Error('Completion percentage must be 0-100');
    const attempt = await _AttemptModel.AttemptModel.upsert(user.id, courseId, data);
    const enrolments = await _LearningPathEnrolmentModel.LearningPathEnrolmentModel.findByUserAndCourse(user.id, courseId);
    for (const enrolment of enrolments) {
      await _LearningPathEnrolmentModel.LearningPathEnrolmentModel.updateProgress(enrolment.id, data.completionPercentage);
    }
    return attempt;
  }

  // Sync progress from SCORM Cloud for a specific ScormAttempt
  static async syncScormProgress(scormAttemptId, requester) {
    const scormAttempt = await _db.prisma.scormAttempt.findUnique({
      where: {
        id: scormAttemptId
      },
      include: {
        scormPackage: true,
        attempt: true
      }
    });
    if (!scormAttempt) throw new Error('ScormAttempt not found');
    if (!scormAttempt.scormCloudRegistrationId) throw new Error('No SCORM Cloud registration');
    if (requester.userRole === 'LEARNER' && scormAttempt.userId !== requester.id) {
      throw new Error('Access denied');
    }
    if (requester.userRole === 'HR_MANAGER') {
      const owner = await _db.prisma.user.findUnique({
        where: {
          id: scormAttempt.userId
        },
        select: {
          orgId: true
        }
      });
      if (!owner || owner.orgId !== requester.orgId) {
        throw new Error('Access denied');
      }
    }
    const registrationId = scormAttempt.scormCloudRegistrationId;

    // Pull registration details from SCORM Cloud (correct endpoint)
    const client = _ScormCloudService.ScormCloudService.init();
    const res = await client.get(`/registrations/${registrationId}`);
    const registration = res.data;

    // Map Cloud data to ScormAttempt
    const updateData = {
      status: registration.registrationCompletion === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
      completionPercentage: Math.round((registration.registrationCompletionAmount || 0) * 100),
      score: registration.score?.raw || null,
      learningHours: registration.totalSecondsTracked ? registration.totalSecondsTracked / 3600 : null,
      scormCloudLastSyncAt: new Date(),
      scormCloudCompletion: registration.registrationCompletionAmount || 0,
      scormCloudScoreScaled: registration.score?.scaled || null,
      updatedAt: new Date()
    };
    const updated = await _db.prisma.scormAttempt.update({
      where: {
        id: scormAttemptId
      },
      data: updateData,
      include: {
        scormPackage: true,
        attempt: true
      }
    });

    // Roll up to course Attempt if linked
    if (updated.attemptId) {
      await AttemptService.rollUpCourseCompletion(updated.attemptId); // FIXED: call on class name
    }
    return updated;
  }

  // Helper: Parse ISO 8601 duration (e.g. PT1H2M3S) to hours
  static parseDurationToHours(duration) {
    if (!duration) return null;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+\.?\d*)S)?/);
    if (!match) return null;
    const h = parseFloat(match[1] || 0);
    const m = parseFloat(match[2] || 0);
    const s = parseFloat(match[3] || 0);
    return h + m / 60 + s / 3600;
  }

  // Roll up package progress to course-level Attempt
  static async rollUpCourseCompletion(courseAttemptId) {
    const courseAttempt = await _db.prisma.attempt.findUnique({
      where: {
        id: courseAttemptId
      },
      include: {
        scormAttempts: true
      }
    });
    if (!courseAttempt) return;
    const packageAttempts = courseAttempt.scormAttempts;
    const avgCompletion = packageAttempts.length > 0 ? packageAttempts.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / packageAttempts.length : 0;
    await _db.prisma.attempt.update({
      where: {
        id: courseAttemptId
      },
      data: {
        completionPercentage: avgCompletion,
        status: avgCompletion >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
        updatedAt: new Date()
      }
    });
  }
}
exports.AttemptService = AttemptService;