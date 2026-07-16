"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AuthService = void 0;
var _bcryptjs = _interopRequireDefault(require("bcryptjs"));
var _jwtUtils = require("../utils/jwtUtils.js");
var _UserModel = require("../models/UserModel.js");
var _db = require("../utils/db.js");
var _env = require("../config/env.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class AuthService {
  static async login(email, password) {
    if (!email || !password) throw new Error('Email and password required');
    const user = await _UserModel.UserModel.findByEmail(email);
    if (!user || user.authProvider !== 'LOCAL' || user.status !== 'ACTIVE') {
      throw new Error('Invalid credentials');
    }
    const passwordMatch = await _bcryptjs.default.compare(password, user.password);
    if (!passwordMatch) throw new Error('Invalid credentials');
    const {
      accessToken,
      refreshToken
    } = (0, _jwtUtils.generateTokens)(user.id, user.userRole);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        userRole: user.userRole
      }
    };
  }
  static async phoneLogin(credentials) {
    const {
      phoneNumber,
      password
    } = credentials;
    if (!phoneNumber || !password) throw new Error('Phone number and password required');
    const user = await _UserModel.UserModel.findByPhone(phoneNumber);
    if (!user || user.authProvider !== 'LOCAL' || user.status !== 'ACTIVE') {
      throw new Error('Invalid credentials');
    }
    const passwordMatch = await _bcryptjs.default.compare(password, user.password);
    if (!passwordMatch) throw new Error('Invalid credentials');
    const {
      accessToken,
      refreshToken
    } = (0, _jwtUtils.generateTokens)(user.id, user.userRole);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userRole: user.userRole,
        orgId: user.orgId
      }
    };
  }
  static async refresh(refreshToken) {
    if (!refreshToken) throw new Error('Refresh token required');
    const decoded = (0, _jwtUtils.verifyToken)(refreshToken, true);
    const user = await _UserModel.UserModel.findById(decoded.id);
    if (!user || user.status !== 'ACTIVE') throw new Error('Invalid refresh token');
    const {
      accessToken
    } = (0, _jwtUtils.generateTokens)(user.id, user.userRole);
    return {
      accessToken
    };
  }
  static async logout(refreshToken) {
    return {
      message: 'Logged out'
    };
  }
  static async registerDevice(userId, deviceType, deviceToken) {
    if (!deviceType || !deviceToken) throw new Error('Device type and token required');
    const device = await _db.prisma.device.create({
      data: {
        userId,
        deviceType,
        deviceToken,
        registeredAt: new Date()
      }
    });
    return {
      deviceId: device.id
    };
  }
  static async verifyMFA(userId, mfaToken, setup = false) {
    if ((0, _env.isProductionEnv)() && !(0, _env.isFeatureEnabled)('ENABLE_MFA')) {
      throw new Error('MFA is not configured');
    }
    const user = await _UserModel.UserModel.findById(userId);
    if (!user) throw new Error('User not found');
    if (setup) {
      throw new Error('MFA setup is not configured');
    }
    if (!mfaToken) throw new Error('MFA token required');
    throw new Error('MFA is not configured');
  }
  static async ssoCallback(code) {
    if (!code) throw new Error('Authorization code required');
    if ((0, _env.isProductionEnv)() && !(0, _env.isFeatureEnabled)('ENABLE_SSO')) {
      throw new Error('SSO is not configured');
    }
    throw new Error('SSO is not configured');
  }
}
exports.AuthService = AuthService;