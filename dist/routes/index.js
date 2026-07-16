"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _authRoutes = _interopRequireDefault(require("./authRoutes.js"));
var _userRoutes = _interopRequireDefault(require("./userRoutes.js"));
var _courseRoutes = _interopRequireDefault(require("./courseRoutes.js"));
var _scormRoutes = _interopRequireDefault(require("./scormRoutes.js"));
var _groupRoutes = _interopRequireDefault(require("./groupRoutes.js"));
var _assignmentRoutes = _interopRequireDefault(require("./assignmentRoutes.js"));
var _dashboardRoutes = _interopRequireDefault(require("./dashboardRoutes.js"));
var _learningPathRoute = _interopRequireDefault(require("./learningPathRoute.js"));
var _certificateRouter = _interopRequireDefault(require("./certificateRouter.js"));
var _reward = _interopRequireDefault(require("./reward.js"));
var _attemptRoute = _interopRequireDefault(require("./attemptRoute.js"));
var _scormCallback = _interopRequireDefault(require("./scorm-callback.js"));
var _fieldTask = _interopRequireDefault(require("./fieldTask.js"));
var _announcementRoute = _interopRequireDefault(require("./announcementRoute.js"));
var _pushRoutes = _interopRequireDefault(require("./pushRoutes.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const router = (0, _express.Router)();
router.use('/auth', _authRoutes.default);
router.use('/users', _userRoutes.default);
router.use('/groups', _groupRoutes.default);
router.use('/courses', _courseRoutes.default);
router.use('/scorm-packages', _scormRoutes.default);
router.use('/assignments', _assignmentRoutes.default);
router.use('/dashboard', _dashboardRoutes.default);
router.use('/learning-paths', _learningPathRoute.default);
router.use('/certificates', _certificateRouter.default);
router.use('/rewards', _reward.default);
router.use('/attempts', _attemptRoute.default);
router.use('/scorm-callback', _scormCallback.default);
router.use('/field-tasks', _fieldTask.default);
router.use('/announcements', _announcementRoute.default);
router.use('/push', _pushRoutes.default);
var _default = exports.default = router;