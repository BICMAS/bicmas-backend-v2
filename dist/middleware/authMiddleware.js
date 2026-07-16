"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.requireRole = exports.authenticateToken = void 0;
var _jwtUtils = require("../utils/jwtUtils.js");
var _UserModel = require("../models/UserModel.js");
var _env = require("../config/env.js");
const authenticateToken = async (req, res, next) => {
  if (!(0, _env.isProductionEnv)()) {
    console.log(`[AUTH] ${req.method} ${req.url}`);
  }
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access token required (Bearer format)'
      });
    }
    const token = authHeader.split(' ')[1];
    const decoded = (0, _jwtUtils.verifyToken)(token);
    const user = await _UserModel.UserModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: 'User not found from token ID'
      });
    }
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Inactive user'
      });
    }
    req.user = {
      id: user.id,
      email: user.email,
      userRole: user.userRole,
      orgId: user.orgId
    };
    next();
  } catch (error) {
    console.error('[AUTH ERROR]', error.message);
    return res.status(401).json({
      error: (0, _env.isProductionEnv)() ? 'Invalid token' : `Invalid token: ${error.message}`
    });
  }
};
exports.authenticateToken = authenticateToken;
const requireRole = requiredRoles => (req, res, next) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  if (!req.user || !roles.includes(req.user.userRole)) {
    return res.status(403).json({
      error: 'Insufficient role'
    });
  }
  next();
};
exports.requireRole = requireRole;