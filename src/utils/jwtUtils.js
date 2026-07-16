import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const generateTokens = (userId, userRole) => {
    const payload = { id: userId, role: userRole };
    const accessExpiresIn =
        userRole === 'LEARNER'
            ? (process.env.JWT_LEARNER_ACCESS_EXPIRES_IN || '24h')
            : (process.env.JWT_ACCESS_EXPIRES_IN || '1h');
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: accessExpiresIn });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

export const verifyToken = (token, isRefresh = false) => {
    const secret = isRefresh ? process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET : process.env.JWT_SECRET;
    return jwt.verify(token, secret);
};