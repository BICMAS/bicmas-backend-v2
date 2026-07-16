"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DashboardModel = void 0;
var _db = require("../utils/db.js");
/** Course has no orgId; scope assignments by learner or group in the org. */
function assignmentWhereForOrg(orgId) {
  return {
    OR: [{
      assigneeUser: {
        orgId
      }
    }, {
      group: {
        orgId
      }
    }]
  };
}
class DashboardModel {
  static async getTotalLearners(orgId) {
    try {
      console.log('[DASHBOARD MODEL] getTotalLearners for orgId:', orgId);
      return await _db.prisma.user.count({
        where: {
          orgId,
          userRole: 'LEARNER',
          status: 'ACTIVE'
        }
      });
    } catch (error) {
      console.error('[DASHBOARD MODEL ERROR getTotalLearners]', error.message);
      return 0;
    }
  }
  static async getAverageCompletion(orgId) {
    try {
      console.log('[DASHBOARD MODEL] getAverageCompletion for orgId:', orgId);
      const avgResult = await _db.prisma.attempt.aggregate({
        where: {
          user: {
            orgId
          }
        },
        _avg: {
          completionPercentage: true
        }
      });
      return avgResult._avg.completionPercentage || 0;
    } catch (error) {
      console.error('[DASHBOARD MODEL ERROR getAverageCompletion]', error.message);
      return 0;
    }
  }
  static async getOverdueCourses(orgId) {
    try {
      console.log('[DASHBOARD MODEL] getOverdueCourses for orgId:', orgId);
      return await _db.prisma.assignment.count({
        where: {
          AND: [assignmentWhereForOrg(orgId), {
            dueDate: {
              lt: new Date()
            }
          }, {
            NOT: {
              attempts: {
                some: {
                  status: 'COMPLETED'
                }
              }
            }
          }]
        }
      });
    } catch (error) {
      console.error('[DASHBOARD MODEL ERROR getOverdueCourses]', error.message);
      return 0;
    }
  }
  static async getActiveAssignments(orgId) {
    try {
      console.log('[DASHBOARD MODEL] getActiveAssignments for orgId:', orgId);
      return await _db.prisma.assignment.count({
        where: {
          AND: [assignmentWhereForOrg(orgId), {
            dueDate: {
              gte: new Date()
            }
          }, {
            NOT: {
              attempts: {
                some: {
                  status: 'COMPLETED'
                }
              }
            }
          }]
        }
      });
    } catch (error) {
      console.error('[DASHBOARD MODEL ERROR getActiveAssignments]', error.message);
      return 0;
    }
  }
  static async getTopPerformers(orgId, limit = 5) {
    try {
      console.log('[DASHBOARD MODEL] getTopPerformers for orgId:', orgId);
      const users = await _db.prisma.user.findMany({
        where: {
          orgId,
          userRole: 'LEARNER',
          status: 'ACTIVE'
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          userAttempts: {
            select: {
              completionPercentage: true
            },
            where: {
              status: 'COMPLETED'
            }
          }
        }
      });
      const ranked = users.map(u => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        attempts: u.userAttempts,
        avgCompletion: Math.round(u.userAttempts.reduce((sum, a) => sum + (a.completionPercentage || 0), 0) / Math.max(u.userAttempts.length, 1) * 100) / 100
      })).sort((a, b) => b.avgCompletion - a.avgCompletion).slice(0, limit);
      return ranked;
    } catch (error) {
      console.error('[DASHBOARD MODEL ERROR getTopPerformers]', error.message);
      return [];
    }
  }
  static async getCompletionByDepartment(orgId) {
    try {
      console.log('[DASHBOARD MODEL] getCompletionByDepartment for orgId:', orgId);
      const users = await _db.prisma.user.findMany({
        where: {
          orgId,
          userRole: 'LEARNER',
          status: 'ACTIVE'
        },
        select: {
          department: true,
          userAttempts: true
        }
      });
      const grouped = users.reduce((acc, user) => {
        const department = user.department ?? 'UNASSIGNED';
        if (!acc[department]) acc[department] = [];
        acc[department].push(user);
        return acc;
      }, {});
      return Object.entries(grouped).map(([department, departmentUsers]) => {
        const now = new Date();
        return {
          department,
          totalLearners: departmentUsers.length,
          completed: departmentUsers.filter(u => u.userAttempts.some(a => a.status === 'COMPLETED')).length,
          inProgress: departmentUsers.filter(u => u.userAttempts.some(a => a.status === 'IN_PROGRESS')).length,
          notStarted: departmentUsers.filter(u => u.userAttempts.length === 0).length,
          overdue: departmentUsers.filter(u => u.userAttempts.some(a => a.dueDate && a.dueDate < now && a.status !== 'COMPLETED')).length
        };
      });
    } catch (error) {
      console.error('[DASHBOARD MODEL ERROR getCompletionByDepartment]', error.message);
      return [];
    }
  }
  static async getCourseStatus(orgId) {
    try {
      console.log('[DASHBOARD MODEL] getCourseStatus for orgId:', orgId);
      const now = new Date();
      const learners = await _db.prisma.user.findMany({
        where: {
          orgId,
          userRole: 'LEARNER',
          status: 'ACTIVE'
        },
        select: {
          userAttempts: {
            select: {
              status: true,
              dueDate: true
            }
          }
        }
      });
      const courseStatus = learners.reduce((acc, learner) => {
        const attempts = learner.userAttempts || [];
        if (attempts.length === 0) {
          acc.notStarted += 1;
          return acc;
        }
        const hasOverdue = attempts.some(a => a.dueDate && a.dueDate < now && a.status !== 'COMPLETED');
        if (hasOverdue) {
          acc.overdue += 1;
          return acc;
        }
        const hasInProgress = attempts.some(a => a.status === 'IN_PROGRESS');
        if (hasInProgress) {
          acc.inProgress += 1;
          return acc;
        }
        const hasCompleted = attempts.some(a => a.status === 'COMPLETED');
        if (hasCompleted) {
          acc.completed += 1;
          return acc;
        }

        // Fallback for statuses that are neither completed nor in-progress.
        acc.notStarted += 1;
        return acc;
      }, {
        completed: 0,
        inProgress: 0,
        notStarted: 0,
        overdue: 0
      });
      return courseStatus;
    } catch (error) {
      console.error('[DASHBOARD MODEL ERROR getCourseStatus]', error.message);
      return {
        completed: 0,
        inProgress: 0,
        notStarted: 0,
        overdue: 0
      };
    }
  }
  static async getActiveLearners() {
    return _db.prisma.user.count({
      where: {
        userRole: 'LEARNER',
        status: 'ACTIVE'
      }
    });
  }
  static async getCompletionRate() {
    const avgResult = await _db.prisma.attempt.aggregate({
      where: {
        status: 'COMPLETED'
      },
      _avg: {
        completionPercentage: true
      }
    });
    return avgResult._avg.completionPercentage || 0;
  }

  // static async getAverageSession() {
  //     const avgResult = await prisma.attempt.aggregate({
  //         _avg: { sessionDuration: true }  // Assume Attempt has sessionDuration in minutes
  //     });
  //     return Math.round(avgResult._avg.sessionDuration || 0);
  // }

  static async getSystemLoad() {
    return _db.prisma.attempt.count({
      where: {
        status: 'IN_PROGRESS'
      }
    });
  }
  static async getRecentActivities(limit = 10) {
    console.log('[DASHBOARD MODEL] getRecentActivities');
    return _db.prisma.auditLog.findMany({
      where: {
        eventType: {
          in: ['LOGIN', 'COURSE_START', 'COURSE_COMPLETE']
        }
      },
      // FIXED: Use eventType instead of actionType
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      include: {
        actor: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });
  }
  static async getLearningActivityGraph(days = 30) {
    console.log('[DASHBOARD MODEL] getLearningActivityGraph');
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const dailyData = await _db.prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*) as newAttempts, SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completions
        FROM "attempts"
        WHERE "createdAt" >= ${startDate.toISOString()}
        GROUP BY DATE("createdAt")
        ORDER BY date
      `;
      return dailyData.map(row => ({
        date: row.date,
        newAttempts: Number(row.newattempts || 0),
        completions: Number(row.completions || 0)
      }));
    } catch (error) {
      console.error('[DASHBOARD MODEL ERROR getLearningActivityGraph]', error.message);
      return []; // Fallback empty array
    }
  }
  static async getRecentActivity(limit = 5) {
    console.log('[DASHBOARD MODEL] getRecentActivity');
    return _db.prisma.auditLog.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      include: {
        actor: {
          select: {
            fullName: true
          }
        }
      } // FIXED: Remove target: true
    });
  }
  static async getLearnerStreak(userId) {
    const lastAttempts = await _db.prisma.attempt.findMany({
      where: {
        userId,
        status: 'COMPLETED'
      },
      select: {
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 30 // Last 30 days max
    });
    let streak = 0;
    const today = new Date();
    for (const attempt of lastAttempts) {
      const attemptDate = new Date(attempt.createdAt);
      if (attemptDate.toDateString() === today.toDateString()) {
        streak++;
        break;
      }
      today.setDate(today.getDate() - 1); // FIXED: Consecutive days
      if (attemptDate.toDateString() === today.toDateString()) streak++;else break;
    }
    return streak;
  }
  static async getLearnerPoints(userId) {
    const user = await _db.prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        points: true
      }
    });
    return user?.points || 0;
  }
  static async getLearnerHours(userId) {
    const total = await _db.prisma.attempt.aggregate({
      where: {
        userId
      },
      _sum: {
        learningHours: true
      }
    });
    return total._sum.learningHours || 0;
  }
  static async getCoursesDone(userId) {
    const uniqueCourses = await _db.prisma.attempt.groupBy({
      by: ['courseId'],
      where: {
        userId,
        status: 'COMPLETED'
      },
      _count: {
        courseId: true
      }
    });
    return uniqueCourses.length;
  }
  static async getAverageScore(userId) {
    const avgResult = await _db.prisma.attempt.aggregate({
      where: {
        userId,
        status: 'COMPLETED'
      },
      _avg: {
        score: true
      }
    });
    return avgResult._avg.score || 0;
  }
  static async getLearnerPaths(userId) {
    console.log('[DASHBOARD MODEL] getLearnerPaths for userId:', userId);
    return _db.prisma.learningPathEnrolment.findMany({
      where: {
        userId
      },
      include: {
        learningPath: {
          select: {
            // FIXED: Scalars + nested relation select
            id: true,
            title: true,
            description: true,
            enrolmentRule: true,
            curriculumSequence: true,
            status: true,
            creator: {
              // FIXED: Nested select for relation (no include)
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }
      }
    });
  }
  static async getLearningActivity(userId) {
    const attempts = await _db.prisma.attempt.findMany({
      where: {
        userId,
        status: 'COMPLETED'
      },
      select: {
        learningHours: true,
        createdAt: true
      },
      take: 50 // Last 50 for 7 days
    });
    const activity = {
      Sun: 0,
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0
    };
    attempts.forEach(a => {
      const day = new Date(a.createdAt).getDay(); // 0=Sun, 6=Sat
      activity[Object.keys(activity)[day]] += a.learningHours || 0;
    });
    return activity;
  }
  static async getCurrentCourse(userId) {
    console.log('[DASHBOARD MODEL] getCurrentCourse for userId:', userId);
    try {
      // 1. Find the most recent in-progress attempt for the user
      const attempt = await _db.prisma.attempt.findFirst({
        where: {
          userId,
          status: 'IN_PROGRESS'
        },
        orderBy: {
          updatedAt: 'desc'
        },
        // most recent
        include: {
          course: true,
          scormPackage: true
        }
      });
      if (!attempt) return null;

      // 2. Try to find assignment only if courseId exists
      let assignment = null;
      if (attempt.courseId) {
        assignment = await _db.prisma.assignment.findFirst({
          where: {
            courseId: attempt.courseId,
            assigneeUserId: userId
          },
          include: {
            course: true
          }
        });
      }

      // 3. Return combined result (prefer assignment if exists, fallback to attempt data)
      return assignment || {
        course: attempt.course,
        attempt,
        scormPackage: attempt.scormPackage || null
      };
    } catch (error) {
      console.error('[DASHBOARD MODEL ERROR getCurrentCourse]', error.message);
      return null;
    }
  }
  static async getQuizStats(userId) {
    const quizAttempts = await _db.prisma.quizAttempt.findMany({
      where: {
        userId
      },
      select: {
        percentage: true,
        passed: true,
        score: true
      }
    });
    const totalQuizzes = quizAttempts.length;
    const passed = quizAttempts.filter(q => q.passed).length;
    const avgQuizScore = totalQuizzes > 0 ? quizAttempts.reduce((sum, q) => sum + q.percentage, 0) / totalQuizzes : 0;
    return {
      totalQuizzes,
      passedQuizzes: passed,
      failedQuizzes: totalQuizzes - passed,
      averageQuizScore: Math.round(avgQuizScore * 100) / 100
    };
  }
  static async getDailyLearningActivity(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const attempts = await _db.prisma.attempt.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate
        }
      },
      select: {
        createdAt: true,
        learningHours: true
      }
    });
    const activity = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      activity[dateStr] = 0;
    }
    attempts.forEach(a => {
      const dateStr = a.createdAt.toISOString().split('T')[0];
      if (activity[dateStr] !== undefined) {
        activity[dateStr] += a.learningHours || 0;
      }
    });
    return activity;
  }
  static async getUnfinishedCourses(userId) {
    console.log('[DASHBOARD MODEL] getUnfinishedCourses for userId:', userId);
    try {
      // FIXED: First find all assignments for user
      const assignments = await _db.prisma.assignment.findMany({
        where: {
          assigneeUserId: userId
        },
        include: {
          course: true
        }
      });

      // FIXED: Second, find completed courses for user (unique courseIds)
      const completedCourses = await _db.prisma.attempt.findMany({
        where: {
          userId,
          status: 'COMPLETED'
        },
        select: {
          courseId: true
        }
      }).then(attempts => [...new Set(attempts.map(a => a.courseId))]); // Unique courseIds

      // FIXED: Filter assignments without completed course
      const unfinished = assignments.filter(a => !completedCourses.includes(a.courseId));
      return unfinished;
    } catch (error) {
      console.error('[DASHBOARD MODEL ERROR getUnfinishedCourses]', error.message);
      return [];
    }
  }

  // static async getCriticalAlerts(threshold = 50) {  // Courses with <50% completion
  //     console.log('[DASHBOARD MODEL] getCriticalAlerts');
  //     const courses = await prisma.course.findMany({
  //         where: {
  //             assignments: {
  //                 some: {
  //                     attempts: {
  //                         none: { status: 'COMPLETED' }  // FIXED: Assignments with incomplete attempts
  //                     }
  //                 }
  //             }
  //         },
  //         include: {
  //             assignments: {
  //                 include: {
  //                     attempts: {
  //                         select: { completionPercentage: true, status: true }
  //                     }
  //                 }
  //             }
  //         }
  //     });
  //     const alerts = courses.map(c => {
  //         const allAttempts = c.assignments.flatMap(a => a.attempts);
  //         const completedAttempts = allAttempts.filter(a => a.status === 'COMPLETED');
  //         const avgCompletion = completedAttempts.length > 0 ? completedAttempts.reduce((sum, a) => sum + (a.completionPercentage || 0), 0) / completedAttempts.length : 0;
  //         const failureRate = 100 - (avgCompletion * 100);
  //         return {
  //             id: c.id,
  //             title: c.title,
  //             failureRate: Math.round(failureRate * 100) / 100
  //         };
  //     }).filter(c => c.failureRate > threshold);
  //     return alerts.sort((a, b) => b.failureRate - a.failureRate);
  // }
}
exports.DashboardModel = DashboardModel;