"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AttemptModel = void 0;
var _db = require("../utils/db.js");
class AttemptModel {
  static async upsert(userId, courseId, data) {
    console.log('[ATTEMPT MODEL] Upsert for userId:', userId, 'courseId:', courseId);
    return _db.prisma.attempt.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      update: {
        status: data.status,
        completionPercentage: data.completionPercentage,
        notes: data.notes,
        updatedAt: new Date()
      },
      create: {
        userId,
        courseId,
        status: data.status,
        completionPercentage: data.completionPercentage,
        notes: data.notes
      },
      include: {
        user: true,
        course: true
      }
    });
  }
  static async findByUserId(userId) {
    return _db.prisma.attempt.findMany({
      where: {
        userId
      },
      include: {
        course: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
  static async findByUserAndCourse(userId, courseId) {
    return _db.prisma.attempt.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      }
    });
  }
}
exports.AttemptModel = AttemptModel;