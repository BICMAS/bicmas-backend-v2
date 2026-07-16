"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AssignmentService = void 0;
var _AssignmentModel = require("../models/AssignmentModel.js");
var _CourseModel = require("../models/CourseModel.js");
var _UserModel = require("../models/UserModel.js");
class AssignmentService {
  static async createAssignments(data, assigner) {
    const {
      courseId,
      learnerIds,
      dueDate,
      reminder
    } = data;

    // Validate required
    if (!courseId) throw new Error('Course ID required');
    if (!learnerIds || !Array.isArray(learnerIds) || learnerIds.length === 0) throw new Error('Learner IDs array required');

    // Validate course
    const course = await _CourseModel.CourseModel.findById(courseId);
    if (!course) throw new Error('Course not found');
    if (course.status !== 'PUBLISHED') throw new Error('Only published courses can be assigned');

    // Validate assigner
    if (assigner.userRole !== 'HR_MANAGER' && assigner.userRole !== 'SUPER_ADMIN') {
      throw new Error('Only HR and super admin can assign courses');
    }

    // Validate learners
    const learners = await _UserModel.UserModel.findManyByIds(learnerIds);
    if (learners.length !== learnerIds.length) throw new Error('Some learners not found');
    if (assigner.userRole === 'HR_MANAGER') {
      const invalid = learners.filter(l => l.orgId !== assigner.orgId);
      if (invalid.length > 0) throw new Error('HR can only assign to org learners');
    }

    // Create assignments
    const assignments = await _AssignmentModel.AssignmentModel.createMany(learnerIds.map(learnerId => ({
      courseId,
      assignerId: assigner.id,
      assigneeUserId: learnerId,
      dueDate,
      recurrenceRule: reminder
    })));
    return assignments;
  }
  static async getAssignedCourses(user) {
    if (user.userRole !== 'LEARNER') {
      throw new Error('Only learners can view assigned courses');
    }
    const assignments = await _AssignmentModel.AssignmentModel.findByLearnerId(user.id);
    return assignments.map(assignment => {
      // Get attempts for THIS specific course
      const courseAttempts = assignment.assigneeUser?.userAttempts?.filter(attempt => attempt.courseId === assignment.courseId) || [];

      // Calculate progress
      let progress = 0;
      if (courseAttempts.length > 0) {
        // Use the most recent attempt
        const latestAttempt = courseAttempts.reduce((latest, current) => {
          return !latest || new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
        }, null);
        progress = latestAttempt?.completionPercentage || 0;
      }
      return {
        ...assignment,
        progress: Math.min(100, Math.max(0, progress)),
        totalAttempts: courseAttempts.length,
        attempts: courseAttempts
      };
    });
  }
}
exports.AssignmentService = AssignmentService;