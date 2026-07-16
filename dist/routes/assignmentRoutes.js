"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _AssignmentController = require("../controllers/AssignmentController.js");
var _authMiddleware = require("../middleware/authMiddleware.js");
const assignmentRouter = (0, _express.Router)();
assignmentRouter.post('/', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['HR_MANAGER', 'SUPER_ADMIN']), _AssignmentController.createAssignments);
assignmentRouter.get('/assigned-courses', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['LEARNER']), _AssignmentController.getAssignedCourses);
var _default = exports.default = assignmentRouter;