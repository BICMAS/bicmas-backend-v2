import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { login, ssoCallback, refresh, logout, registerDevice, verifyMFA, phoneLogin } from '../controllers/AuthControllers.js';

const authRouter = Router();

// Public (rate-limited)
authRouter.post('/login', authRateLimiter, login);
authRouter.post('/phone-login', authRateLimiter, phoneLogin);
authRouter.post('/sso/callback', authRateLimiter, ssoCallback);
authRouter.post('/refresh', authRateLimiter, refresh);

// Protected
authRouter.post('/logout', authenticateToken, logout);
authRouter.post('/device/register', authenticateToken, registerDevice);
authRouter.post('/verify-mfa', authenticateToken, verifyMFA);

export default authRouter;