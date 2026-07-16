"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updateUser = exports.unblockUser = exports.getUser = exports.getCurrentOrgUsers = exports.getAllUsers = exports.deleteUser = exports.createUser = exports.bulkUpload = exports.blockUser = void 0;
var _UserService = require("../service/UserService.js");
var _multer = _interopRequireDefault(require("multer"));
var _csvParser = _interopRequireDefault(require("csv-parser"));
var _fs = _interopRequireDefault(require("fs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const upload = (0, _multer.default)({
  dest: 'uploads/'
});
const getAllUsers = async (req, res) => {
  try {
    const users = await _UserService.UserService.getAllUsers(req.user);
    res.json(users);
  } catch (error) {
    res.status(403).json({
      error: error.message
    });
  }
};
exports.getAllUsers = getAllUsers;
const getCurrentOrgUsers = async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[ORG CTRL START] ${timestamp} - User role: ${req.user.userRole}, orgId: ${req.user.orgId}`);
  try {
    const users = await _UserService.UserService.getCurrentOrgUsers(req.user);
    console.log(`[ORG CTRL END] ${timestamp} - Returned ${users.length} users`);
    res.json(users || []); // FIXED: Always return array (empty OK)
  } catch (error) {
    console.error(`[ORG CTRL ERROR] ${timestamp} - ${error.message}`);
    res.status(500).json({
      error: error.message
    }); // FIXED: 500 for service errors (not 403)
  }
};
exports.getCurrentOrgUsers = getCurrentOrgUsers;
const getUser = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const user = await _UserService.UserService.getUser(id, req.user);
    res.json(user);
  } catch (error) {
    const status = error.message === 'Access denied' || error.message.includes('Insufficient role') ? 403 : 404;
    res.status(status).json({
      error: error.message
    });
  }
};
exports.getUser = getUser;
const createUser = async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[USER CTRL START] ${timestamp} - Body keys: ${Object.keys(req.body).join(', ')}, req.user: ${req.user ? req.user.userRole : 'UNDEFINED'}`);
  try {
    if (!req.user) {
      console.log(`[USER CTRL FAIL] ${timestamp} - No req.user, 401`);
      return res.status(401).json({
        error: 'Unauthorized - no user context'
      });
    }
    const result = await _UserService.UserService.createUser(req.body, req.user);
    console.log(`[USER CTRL SUCCESS] ${timestamp} - Created user ID: ${result.id}`);
    res.status(201).json(result);
  } catch (error) {
    console.error(`[USER CTRL ERROR] ${timestamp} - ${error.message}`);
    res.status(400).json({
      error: error.message
    });
  }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const result = await _UserService.UserService.updateUser(id, req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};
exports.updateUser = updateUser;
const blockUser = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const result = await _UserService.UserService.blockUser(id);
    res.json(result);
  } catch (error) {
    const status = error.message === 'User not found' ? 404 : 400;
    res.status(status).json({
      error: error.message
    });
  }
};
exports.blockUser = blockUser;
const unblockUser = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const result = await _UserService.UserService.unblockUser(id);
    res.json(result);
  } catch (error) {
    const status = error.message === 'User not found' ? 404 : 400;
    res.status(status).json({
      error: error.message
    });
  }
};
exports.unblockUser = unblockUser;
const deleteUser = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const result = await _UserService.UserService.deleteUser(id, req.user);
    res.json(result);
  } catch (error) {
    const status = error.message === 'User not found' ? 404 : 400;
    res.status(status).json({
      error: error.message
    });
  }
};
exports.deleteUser = deleteUser;
const bulkUpload = (req, res) => {
  upload.single('csv')(req, res, async err => {
    if (err) return res.status(400).json({
      error: 'File upload failed'
    });
    const results = [];
    _fs.default.createReadStream(req.file.path).pipe((0, _csvParser.default)()).on('data', data => results.push(data)).on('end', async () => {
      _fs.default.unlinkSync(req.file.path); // Clean up
      try {
        const result = await _UserService.UserService.bulkUpload(results, req.user);
        res.json(result);
      } catch (error) {
        res.status(400).json({
          error: error.message
        });
      }
    });
  });
};
exports.bulkUpload = bulkUpload;