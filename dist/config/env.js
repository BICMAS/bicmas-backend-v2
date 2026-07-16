"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getCorsOrigins = getCorsOrigins;
exports.isFeatureEnabled = isFeatureEnabled;
exports.isProductionEnv = isProductionEnv;
exports.validateEnv = validateEnv;
var _dotenv = _interopRequireDefault(require("dotenv"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
_dotenv.default.config();
const isProduction = process.env.NODE_ENV === 'production';
function validateEnv() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
  if (isProduction && !process.env.SCORM_CALLBACK_SECRET) {
    throw new Error('SCORM_CALLBACK_SECRET is required in production');
  }
  if (isProduction && !process.env.CORS_ORIGINS) {
    console.warn('[ENV] CORS_ORIGINS not set — using restrictive default (no cross-origin requests)');
  }
  if (isProduction && !process.env.AWS_S3_BUCKET_NAME && !process.env.S3_BUCKET_NAME) {
    console.warn('[ENV] AWS_S3_BUCKET_NAME not set — file uploads will fail');
  }
}
function getCorsOrigins() {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) {
    return isProduction ? [] : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];
  }
  return raw.split(',').map(origin => origin.trim()).filter(Boolean);
}
function isProductionEnv() {
  return isProduction;
}
function isFeatureEnabled(flagName) {
  return process.env[flagName] === 'true';
}