"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _AttemptController = require("../controllers/AttemptController.js");
var _authMiddleware = require("../middleware/authMiddleware.js");
const attemptRouter = (0, _express.Router)();
attemptRouter.patch('/:courseId', _authMiddleware.authenticateToken, _AttemptController.updateProgress);
attemptRouter.patch('/:scormAttemptId/sync-progress', _authMiddleware.authenticateToken, _AttemptController.syncScormProgress);
var _default = exports.default = attemptRouter;