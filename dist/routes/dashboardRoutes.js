"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _DashboardController = require("../controllers/DashboardController.js");
var _authMiddleware = require("../middleware/authMiddleware.js");
var _console = require("console");
const dashboardRouter = (0, _express.Router)();
dashboardRouter.get('/hr', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)('HR_MANAGER'), _DashboardController.getHRDashboard);
dashboardRouter.get('/hr/learners/:learnerId/course-tracking', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)('HR_MANAGER'), _DashboardController.getLearnerCourseTracking);
dashboardRouter.get('/hr/learners/course-tracking', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)('HR_MANAGER'), _DashboardController.getAllLearnersCourseTracking);
dashboardRouter.get('/super', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)('SUPER_ADMIN'), _DashboardController.getSuperAdminDashboard);
dashboardRouter.get('/learner', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)('LEARNER'), _DashboardController.getLearnerDashboard);
var _default = exports.default = dashboardRouter;