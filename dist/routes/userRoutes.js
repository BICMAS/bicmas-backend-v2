"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _UserController = require("../controllers/UserController.js");
var _authMiddleware = require("../middleware/authMiddleware.js");
const userRouter = (0, _express.Router)();

// Public
userRouter.post('/', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN', "HR_MANAGER"]), _UserController.createUser);

// Protected
userRouter.get('/:id', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN', 'HR_MANAGER']), _UserController.getUser);
userRouter.put('/:id', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN', 'HR_MANAGER']), _UserController.updateUser);
userRouter.post('/bulk-upload', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN', 'HR_MANAGER']), _UserController.bulkUpload);
userRouter.get('/', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN']), _UserController.getAllUsers);
userRouter.get('/organization/users', _authMiddleware.authenticateToken, _UserController.getCurrentOrgUsers);

// SUPER_ADMIN actions
userRouter.patch('/:id/block', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN']), _UserController.blockUser);
userRouter.patch('/:id/unblock', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN']), _UserController.unblockUser);
userRouter.delete('/:id', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN', 'HR_MANAGER']), _UserController.deleteUser);
var _default = exports.default = userRouter;