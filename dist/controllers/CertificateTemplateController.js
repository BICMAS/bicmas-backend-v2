"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.uploadTemplate = exports.issueCertificate = exports.getMyAssignedTemplate = exports.getCourseAssignedTemplate = exports.downloadTemplate = exports.downloadLatestTemplate = exports.claimLearnerCertificate = exports.assignTemplateToHRManager = exports.assignTemplateToCourse = void 0;
var _multer = _interopRequireDefault(require("multer"));
var _fs = _interopRequireDefault(require("fs"));
var _CertificateTemplateService = require("../service/CertificateTemplateService.js");
var _StorageService = require("../services/StorageService.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const upload = (0, _multer.default)({
  storage: _multer.default.diskStorage({
    destination: 'uploads/temp/',
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  }),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  // 10MB for PDFs
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'), false);
    }
  }
});
const uploadTemplate = (req, res) => {
  upload.single('template')(req, res, async err => {
    if (err) return res.status(400).json({
      error: 'Upload failed'
    });
    if (!req.file) return res.status(400).json({
      error: 'No file uploaded'
    });
    try {
      const uploadedBy = req.user.id;
      const {
        description
      } = req.body; // Optional
      const result = await _CertificateTemplateService.CertificateTemplateService.uploadTemplate(req.file.path, req.file.originalname, description, uploadedBy);
      res.status(201).json({
        url: await _StorageService.StorageService.resolveStorageUrl(result.blobUrl),
        id: result.id,
        filename: result.filename,
        downloadUrl: `${req.protocol}://${req.get('host')}/api/v1/certificates/${result.id}/download`
      });
    } catch (error) {
      res.status(400).json({
        error: error.message
      });
    } finally {
      if (req.file?.path && _fs.default.existsSync(req.file.path)) {
        _fs.default.unlinkSync(req.file.path); // Clean temp
      }
    }
  });
};
exports.uploadTemplate = uploadTemplate;
const downloadTemplate = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const template = await _CertificateTemplateService.CertificateTemplateService.getTemplateById(id);
    const fileBuffer = await _StorageService.StorageService.getObjectBuffer(template.blobUrl);
    res.setHeader('Content-Type', template.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
    return res.status(200).send(fileBuffer);
  } catch (error) {
    const status = error.message === 'Certificate template not found' ? 404 : 400;
    return res.status(status).json({
      error: error.message
    });
  }
};
exports.downloadTemplate = downloadTemplate;
const downloadLatestTemplate = async (req, res) => {
  try {
    const template = await _CertificateTemplateService.CertificateTemplateService.getLatestTemplate();
    const fileBuffer = await _StorageService.StorageService.getObjectBuffer(template.blobUrl);
    res.setHeader('Content-Type', template.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
    return res.status(200).send(fileBuffer);
  } catch (error) {
    const status = error.message === 'No certificate templates found' ? 404 : 400;
    return res.status(status).json({
      error: error.message
    });
  }
};
exports.downloadLatestTemplate = downloadLatestTemplate;
const assignTemplateToCourse = async (req, res) => {
  try {
    const {
      courseId,
      templateId
    } = req.body;
    const result = await _CertificateTemplateService.CertificateTemplateService.assignTemplateToCourse(courseId, templateId, req.user.id, req.user);
    return res.status(200).json({
      message: 'Template assigned to course successfully',
      ...result
    });
  } catch (error) {
    const knownNotFound = ['Course not found', 'Certificate template not found'];
    const status = knownNotFound.includes(error.message) ? 404 : 400;
    return res.status(status).json({
      error: error.message
    });
  }
};
exports.assignTemplateToCourse = assignTemplateToCourse;
const assignTemplateToHRManager = async (req, res) => {
  try {
    const {
      templateId,
      orgId,
      hrManagerId
    } = req.body;
    const result = await _CertificateTemplateService.CertificateTemplateService.assignTemplateToHRManager({
      templateId,
      orgId,
      hrManagerId,
      actorId: req.user.id
    });
    return res.status(200).json({
      message: 'Template assigned to HR manager successfully',
      ...result
    });
  } catch (error) {
    const knownNotFound = ['Certificate template not found', 'HR manager not found'];
    const status = knownNotFound.includes(error.message) ? 404 : 400;
    return res.status(status).json({
      error: error.message
    });
  }
};
exports.assignTemplateToHRManager = assignTemplateToHRManager;
const getMyAssignedTemplate = async (req, res) => {
  try {
    const result = await _CertificateTemplateService.CertificateTemplateService.getAssignedTemplateForHRManager(req.user.id, req.user.orgId);
    return res.status(200).json(result);
  } catch (error) {
    const knownNotFound = ['No certificate template assigned to this HR manager', 'Certificate template not found'];
    const status = knownNotFound.includes(error.message) ? 404 : 400;
    return res.status(status).json({
      error: error.message
    });
  }
};
exports.getMyAssignedTemplate = getMyAssignedTemplate;
const getCourseAssignedTemplate = async (req, res) => {
  try {
    const {
      courseId
    } = req.params;
    const result = await _CertificateTemplateService.CertificateTemplateService.getAssignedTemplateForCourse(courseId);
    return res.status(200).json(result);
  } catch (error) {
    const knownNotFound = ['Course not found', 'No template assigned to course', 'Certificate template not found'];
    const status = knownNotFound.includes(error.message) ? 404 : 400;
    return res.status(status).json({
      error: error.message
    });
  }
};
exports.getCourseAssignedTemplate = getCourseAssignedTemplate;
const issueCertificate = async (req, res) => {
  try {
    const {
      userId,
      courseId,
      templateId
    } = req.body;
    const result = await _CertificateTemplateService.CertificateTemplateService.issueCertificate({
      userId,
      courseId,
      templateId,
      issuerId: req.user.id,
      requester: req.user
    });
    return res.status(201).json(result);
  } catch (error) {
    const knownNotFound = ['User not found', 'Course not found', 'Certificate template not found'];
    const status = knownNotFound.includes(error.message) ? 404 : 400;
    return res.status(status).json({
      error: error.message
    });
  }
};
exports.issueCertificate = issueCertificate;
const claimLearnerCertificate = async (req, res) => {
  try {
    const {
      courseId
    } = req.params;
    const result = await _CertificateTemplateService.CertificateTemplateService.claimLearnerCertificate(req.user.id, courseId);
    return res.status(200).json(result);
  } catch (error) {
    const knownNotFound = ['Course not assigned to learner', 'Course not found', 'No template assigned to course', 'Certificate template not found'];
    const status = error.message === 'Course not yet completed' ? 403 : knownNotFound.includes(error.message) ? 404 : 400;
    return res.status(status).json({
      error: error.message
    });
  }
};
exports.claimLearnerCertificate = claimLearnerCertificate;