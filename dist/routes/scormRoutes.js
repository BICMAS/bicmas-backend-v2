"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _ScormController = require("../controllers/ScormController.js");
var _authMiddleware = require("../middleware/authMiddleware.js");
var _fileUploadMiddleware = require("../middleware/fileUploadMiddleware.js");
// src/routes/scormRouter.js

const scormRouter = (0, _express.Router)();

// SCORM Cloud connection test (admin only)
scormRouter.get('/test-connection', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN', 'HR_MANAGER']), _ScormController.testConnection);

// Upload SCORM package to SCORM Cloud
scormRouter.post('/', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN', 'HR_MANAGER']), _fileUploadMiddleware.uploadMiddleware, _ScormController.uploadPackage);

// Get all SCORM packages
scormRouter.get('/', _authMiddleware.authenticateToken, _ScormController.getPackages);

// Static paths must come before /:id
scormRouter.get('/user/scorm-scores', _authMiddleware.authenticateToken, _ScormController.getUserScormScore);
scormRouter.get('/scorm-attempts/user/sync', _authMiddleware.authenticateToken, _ScormController.syncAndGetUserScormProgress);

// Get specific SCORM package details
scormRouter.get('/:id', _authMiddleware.authenticateToken, _ScormController.getPackage);

// Get launch URL from SCORM Cloud
scormRouter.get('/:id/launch', _authMiddleware.authenticateToken, _ScormController.getLaunch);

// Get manifest (compatibility endpoint)
scormRouter.get('/:id/manifest', _authMiddleware.authenticateToken, _ScormController.getManifest);

// Delete SCORM package (from SCORM Cloud and database)
scormRouter.delete('/:id', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN', 'HR_MANAGER']), _ScormController.deletePackage);
var _default = exports.default = scormRouter;