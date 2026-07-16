"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RewardService = void 0;
var _UserModel = require("../models/UserModel.js");
//import { AuditLogModel } from '../models/AuditLogModel.js';  // Assume exists for logging

class RewardService {
  static async awardPoints(learnerId, points, awarder) {
    if (points <= 0) throw new Error('Points must be positive');
    if (awarder.userRole !== 'HR_MANAGER' && awarder.userRole !== 'SUPER_ADMIN') {
      throw new Error('Only HR and super admin can award points');
    }
    const learner = await _UserModel.UserModel.findById(learnerId);
    if (!learner) throw new Error('Learner not found');
    if (learner.userRole !== 'LEARNER' || learner.status !== 'ACTIVE') {
      throw new Error('Learner must be active');
    }

    // HR_MANAGER can only award learners inside their own organization.
    if (awarder.userRole === 'HR_MANAGER' && learner.orgId !== awarder.orgId) {
      throw new Error('Access denied: HR can only award learners in the same organization');
    }
    const updatedLearner = await _UserModel.UserModel.updatePoints(learnerId, points);

    // Optional audit log
    // await AuditLogModel.create({
    //     eventType: 'POINTS_AWARDED',
    //     actorId: awarder.id,
    //     targetId: learnerId,
    //     payload: { points, total: updatedLearner.points }
    // });

    return updatedLearner;
  }
}
exports.RewardService = RewardService;