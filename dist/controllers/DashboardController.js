"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSuperAdminDashboard = exports.getLearnerDashboard = exports.getLearnerCourseTracking = exports.getHRDashboard = exports.getAllLearnersCourseTracking = void 0;
var _DashboardService = require("../service/DashboardService.js");
var _authMiddleware = require("../middleware/authMiddleware.js");
const getHRDashboard = async (req, res) => {
  try {
    const {
      orgId
    } = req.user;
    if (!orgId) throw new Error('HR must be in an organization');
    const dashboard = await _DashboardService.DashboardService.getHRDashboard(orgId);
    res.json(dashboard);
  } catch (error) {
    res.status(403).json({
      error: error.message
    });
  }
};
exports.getHRDashboard = getHRDashboard;
const getSuperAdminDashboard = async (req, res) => {
  try {
    console.log('[DASHBOARD CTRL SUPER] User:', req.user.userRole);
    const dashboard = await _DashboardService.DashboardService.getSuperAdminDashboard();
    console.log('[DASHBOARD CTRL SUPER] Data keys:', Object.keys(dashboard));
    res.json(dashboard);
  } catch (error) {
    console.error('[DASHBOARD CTRL SUPER ERROR]', error.message);
    res.status(403).json({
      error: error.message
    });
  }
};
exports.getSuperAdminDashboard = getSuperAdminDashboard;
const getLearnerDashboard = async (req, res) => {
  try {
    const result = await _DashboardService.LearnerDashboardService.getLearnerDashboard(req.user);
    res.json(result);
  } catch (error) {
    res.status(403).json({
      error: error.message
    });
  }
};
exports.getLearnerDashboard = getLearnerDashboard;
const getLearnerCourseTracking = async (req, res) => {
  try {
    const {
      learnerId
    } = req.params;
    const result = await _DashboardService.HRCourseTrackingService.getLearnerCourseTracking(req.user, learnerId);
    return res.json(result);
  } catch (error) {
    const status = error.message === 'Learner not found' ? 404 : 403;
    return res.status(status).json({
      error: error.message
    });
  }
};
exports.getLearnerCourseTracking = getLearnerCourseTracking;
const getAllLearnersCourseTracking = async (req, res) => {
  try {
    const result = await _DashboardService.HRCourseTrackingService.getAllLearnersCourseTracking(req.user, req.query);
    return res.json(result);
  } catch (error) {
    const status = error.message === 'HR must be in an organization' ? 403 : 403;
    return res.status(status).json({
      error: error.message
    });
  }
};
exports.getAllLearnersCourseTracking = getAllLearnersCourseTracking;