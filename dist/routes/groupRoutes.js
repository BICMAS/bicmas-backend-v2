"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _GroupController = require("../controllers/GroupController.js");
var _authMiddleware = require("../middleware/authMiddleware.js");
const groupRouter = (0, _express.Router)();
groupRouter.get('/', _authMiddleware.authenticateToken, _GroupController.getGroups);
groupRouter.post('/', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN', 'HR_MANAGER']), _GroupController.createGroup);
groupRouter.post('/:id/members', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN', 'HR_MANAGER']), _GroupController.addGroupMember);
var _default = exports.default = groupRouter;