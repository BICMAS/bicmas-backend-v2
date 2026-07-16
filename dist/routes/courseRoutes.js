"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _multer = _interopRequireDefault(require("multer"));
var _CourseController = require("../controllers/CourseController.js");
var _authMiddleware = require("../middleware/authMiddleware.js");
var _CourseImageController = require("../controllers/CourseImageController.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const courseRouter = (0, _express.Router)();
const upload = (0, _multer.default)({
  storage: _multer.default.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  // 10MB max for course images
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only images allowed'));
  }
});
courseRouter.get('/', _authMiddleware.authenticateToken, _CourseController.getCourses);
courseRouter.post('/draft', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['HR_MANAGER', 'SUPER_ADMIN']), _CourseController.createDraft);
courseRouter.patch('/:id', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['HR_MANAGER', 'SUPER_ADMIN']), _CourseController.updateCourse);
courseRouter.patch('/:id/publish', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['HR_MANAGER', 'SUPER_ADMIN']), _CourseController.publishCourse);
courseRouter.get('/:id', _authMiddleware.authenticateToken, _CourseController.getCourseById);
courseRouter.delete('/:id', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['HR_MANAGER', 'SUPER_ADMIN']), _CourseController.deleteCourse);
courseRouter.delete('/:courseId/modules/:moduleId', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['HR_MANAGER', 'SUPER_ADMIN']), _CourseController.deleteModule);
courseRouter.post('/:courseId/image', _authMiddleware.authenticateToken, upload.single('image'), _CourseImageController.addCourseImage);
var _default = exports.default = courseRouter;