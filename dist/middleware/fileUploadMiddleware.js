"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.uploadMiddleware = void 0;
var _multer = _interopRequireDefault(require("multer"));
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const storage = _multer.default.diskStorage({
  destination: (req, file, cb) => {
    const dir = _path.default.join(process.cwd(), 'uploads/temp');
    _fs.default.mkdirSync(dir, {
      recursive: true
    });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const name = Date.now() + '-' + file.originalname;
    cb(null, name);
  }
});
const upload = (0, _multer.default)({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024
  },
  // 500MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files allowed'), false);
    }
  }
});

// Wrap Multer so we can return the real Multer error message to clients.
const uploadMiddleware = (req, res, next) => {
  const handler = upload.single('package');
  handler(req, res, err => {
    if (err) {
      const message = err?.message || 'File upload failed';
      return res.status(400).json({
        error: message
      });
    }
    return next();
  });
};
exports.uploadMiddleware = uploadMiddleware;