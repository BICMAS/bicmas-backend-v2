"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LearningPathEnrolmentModel = void 0;
var _db = require("../utils/db.js");
class LearningPathEnrolmentModel {
  static async findByUserAndCourse(userId, courseId) {
    console.log('[ENROLMENT MODEL] Finding enrolments for userId:', userId, 'courseId:', courseId);
    return _db.prisma.learningPathEnrolment.findMany({
      where: {
        userId,
        learningPath: {
          curriculumSequence: {
            array_contains: courseId // Matches course in JSON sequence
          }
        }
      },
      include: {
        learningPath: true
      }
    });
  }
  static async updateProgress(enrolmentId, progress) {
    console.log('[ENROLMENT MODEL] Updating progress for enrolmentId:', enrolmentId, 'progress:', progress);
    return _db.prisma.learningPathEnrolment.update({
      where: {
        id: enrolmentId
      },
      data: {
        progress,
        completedAt: progress === 100 ? new Date() : null
      },
      include: {
        learningPath: true,
        user: true
      }
    });
  }
}
exports.LearningPathEnrolmentModel = LearningPathEnrolmentModel;