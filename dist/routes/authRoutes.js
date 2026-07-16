"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _authMiddleware = require("../middleware/authMiddleware.js");
var _rateLimitMiddleware = require("../middleware/rateLimitMiddleware.js");
var _AuthControllers = require("../controllers/AuthControllers.js");
const authRouter = (0, _express.Router)();

// Public (rate-limited)
authRouter.post('/login', _rateLimitMiddleware.authRateLimiter, _AuthControllers.login);
authRouter.post('/phone-login', _rateLimitMiddleware.authRateLimiter, _AuthControllers.phoneLogin);
authRouter.post('/sso/callback', _rateLimitMiddleware.authRateLimiter, _AuthControllers.ssoCallback);
authRouter.post('/refresh', _rateLimitMiddleware.authRateLimiter, _AuthControllers.refresh);

// Protected
authRouter.post('/logout', _authMiddleware.authenticateToken, _AuthControllers.logout);
authRouter.post('/device/register', _authMiddleware.authenticateToken, _AuthControllers.registerDevice);
authRouter.post('/verify-mfa', _authMiddleware.authenticateToken, _AuthControllers.verifyMFA);
var _default = exports.default = authRouter;