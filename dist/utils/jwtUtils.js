"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.verifyToken = exports.generateTokens = void 0;
var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));
var _dotenv = _interopRequireDefault(require("dotenv"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
_dotenv.default.config();
const generateTokens = (userId, userRole) => {
  const payload = {
    id: userId,
    role: userRole
  };
  const accessExpiresIn = userRole === 'LEARNER' ? process.env.JWT_LEARNER_ACCESS_EXPIRES_IN || '24h' : process.env.JWT_ACCESS_EXPIRES_IN || '1h';
  const accessToken = _jsonwebtoken.default.sign(payload, process.env.JWT_SECRET, {
    expiresIn: accessExpiresIn
  });
  const refreshToken = _jsonwebtoken.default.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
  return {
    accessToken,
    refreshToken
  };
};
exports.generateTokens = generateTokens;
const verifyToken = (token, isRefresh = false) => {
  const secret = isRefresh ? process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET : process.env.JWT_SECRET;
  return _jsonwebtoken.default.verify(token, secret);
};
exports.verifyToken = verifyToken;