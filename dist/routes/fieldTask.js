"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _multer = _interopRequireDefault(require("multer"));
var _fieldTask = require("../controllers/fieldTask.js");
var _authMiddleware = require("../middleware/authMiddleware.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const fieldRouter = (0, _express.Router)();
const upload = (0, _multer.default)({
  storage: _multer.default.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  // 50MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);else cb(new Error('Only images and videos allowed'));
  }
});
fieldRouter.get('/', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['HR_MANAGER', 'SUPER_ADMIN']), _fieldTask.getAllFieldTasks);
fieldRouter.get('/me', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)('LEARNER'), _fieldTask.getMyFieldTasks);

// Submit new field task
fieldRouter.post('/', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)('LEARNER'), upload.single('media'), _fieldTask.createFieldTask);

// Get all my submitted field tasks
var _default = exports.default = fieldRouter;