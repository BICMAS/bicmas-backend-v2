"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _CertificateTemplateController = require("../controllers/CertificateTemplateController.js");
var _authMiddleware = require("../middleware/authMiddleware.js");
const certificateRouter = (0, _express.Router)();
certificateRouter.post('/', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN']), _CertificateTemplateController.uploadTemplate);
certificateRouter.get('/latest/download', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['HR_MANAGER', 'SUPER_ADMIN']), _CertificateTemplateController.downloadLatestTemplate);
certificateRouter.get('/my-assigned-template', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['HR_MANAGER']), _CertificateTemplateController.getMyAssignedTemplate);
certificateRouter.get('/course/:courseId/template', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['HR_MANAGER']), _CertificateTemplateController.getCourseAssignedTemplate);
certificateRouter.get('/:id/download', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['HR_MANAGER', 'SUPER_ADMIN']), _CertificateTemplateController.downloadTemplate);
certificateRouter.post('/assign-template', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['HR_MANAGER']), _CertificateTemplateController.assignTemplateToCourse);
certificateRouter.post('/assign-to-hr', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN']), _CertificateTemplateController.assignTemplateToHRManager);
certificateRouter.post('/issue', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['HR_MANAGER']), _CertificateTemplateController.issueCertificate);
certificateRouter.post('/my-courses/:courseId/certificate', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['LEARNER']), _CertificateTemplateController.claimLearnerCertificate);
var _default = exports.default = certificateRouter;