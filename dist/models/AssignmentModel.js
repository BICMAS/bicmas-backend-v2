"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AssignmentModel = void 0;
var _db = require("../utils/db.js");
class AssignmentModel {
  static async createMany(data) {
    // FIXED: Loop with create for include
    const assignments = [];
    for (const assignmentData of data) {
      const assignment = await _db.prisma.assignment.create({
        data: assignmentData,
        include: {
          course: true,
          assigner: true,
          assigneeUser: true
        }
      });
      assignments.push(assignment);
    }
    return assignments;
  }
  static async findByCourseId(courseId) {
    return _db.prisma.assignment.findMany({
      where: {
        courseId
      },
      include: {
        assigneeUser: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        course: true,
        assigner: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });
  }
  static async findByCourseAndLearner(courseId, learnerId) {
    return _db.prisma.assignment.findFirst({
      where: {
        courseId,
        assigneeUserId: learnerId
      }
    });
  }
  static async getAssignedCourses(learnerId) {
    // FIXED: Renamed from findByLearnerId, full nested includes
    console.log('[ASSIGNMENT MODEL] getAssignedCourses for learnerId:', learnerId);
    return _db.prisma.assignment.findMany({
      where: {
        assigneeUserId: learnerId
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: true
              }
            }
          }
        },
        assigner: {
          select: {
            fullName: true
          }
        },
        assigneeUser: {
          // FIXED: Nest attempts under assigneeUser
          include: {
            attempts: {
              select: {
                status: true,
                completionPercentage: true,
                createdAt: true
              }
            }
          }
        }
      }
    });
  }
  static async getAssignedCourses(userId) {
    return _db.prisma.assignment.findMany({
      where: {
        assigneeUserId: userId
      },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: true
              }
            }
          }
        },
        attempts: {
          select: {
            status: true,
            completionPercentage: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
  static async findByLearnerId(learnerId) {
    console.log('[ASSIGNMENT MODEL] findByLearnerId:', learnerId);
    return _db.prisma.assignment.findMany({
      where: {
        assigneeUserId: learnerId
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: true
              }
            }
          }
        },
        assigner: {
          select: {
            fullName: true,
            email: true // Optional: add more user info if needed
          }
        },
        assigneeUser: {
          include: {
            // ✅ Use the correct relation name: "userAttempts" not "attempts"
            userAttempts: {
              select: {
                status: true,
                completionPercentage: true,
                createdAt: true,
                courseId: true // Add this to filter by course
              }
            }
          }
        }
      }
    });
  }
}
exports.AssignmentModel = AssignmentModel;