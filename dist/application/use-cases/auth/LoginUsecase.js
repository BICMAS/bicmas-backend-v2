"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LoginUseCase = void 0;
var _bcryptjs = _interopRequireDefault(require("bcryptjs"));
var _jwt = require("../../../infrastructure/external/jwt.js");
var _User = require("../../../domain/entities/User.js");
var _IUserRepository = require("../../../infrastructure/repositories/IUserRepository.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class LoginUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }
  async execute(email, password) {
    // Input validation (business rule)
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Fetch user via abstract repo
    const userData = await this.userRepository.findByEmail(email);
    if (!userData) {
      throw new Error('Invalid credentials');
    }

    //  Map to domain entity & validate
    const user = new _User.User(userData);
    if (!user.isActive() || user.authProvider !== 'LOCAL') {
      throw new Error('Invalid credentials or unsupported auth provider');
    }

    //  Verify password (business invariant)
    const passwordMatch = await _bcryptjs.default.compare(password, user.password);
    if (!passwordMatch) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens (success)
    const {
      accessToken,
      refreshToken
    } = (0, _jwt.generateTokens)(user.id, user.userRole);

    // Return business result (no HTTP details)
    return {
      accessToken,
      refreshToken,
      user: user.toJSON()
    };
  }
}
exports.LoginUseCase = LoginUseCase;