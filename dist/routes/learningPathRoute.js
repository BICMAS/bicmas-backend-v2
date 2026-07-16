"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _LearningPathController = require("../controllers/LearningPathController.js");
var _authMiddleware = require("../middleware/authMiddleware.js");
const learningPathRouter = (0, _express.Router)();
learningPathRouter.post('/', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN']), _LearningPathController.createPath);
learningPathRouter.get('/', _authMiddleware.authenticateToken, _LearningPathController.getAllPaths);
var _default = exports.default = learningPathRouter;