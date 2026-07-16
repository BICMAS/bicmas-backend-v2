import bcrypt from 'bcryptjs';
import { generateTokens, verifyToken } from '../utils/jwtUtils.js';
import { UserModel } from '../models/UserModel.js';
import { EconomyService } from './EconomyService.js';
import { prisma } from '../utils/db.js';
import { isFeatureEnabled, isProductionEnv } from '../config/env.js';

export class AuthService {
    static async login(email, password) {
        if (!email || !password) throw new Error('Email and password required');

        const user = await UserModel.findByEmail(email);
        if (!user || user.authProvider !== 'LOCAL' || user.status !== 'ACTIVE') {
            throw new Error('Invalid credentials');
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) throw new Error('Invalid credentials');

        await UserModel.recordLogin(user.id, user.metadata);
        if (user.userRole === 'LEARNER') {
            await EconomyService.processLoginStreak(user.id);
        }

        const { accessToken, refreshToken } = generateTokens(user.id, user.userRole);
        return { accessToken, refreshToken, user: { id: user.id, email: user.email, userRole: user.userRole } };
    }

    static async phoneLogin(credentials) {
        const { phoneNumber, password } = credentials;
        if (!phoneNumber || !password) throw new Error('Phone number and password required');

        const user = await UserModel.findByPhone(phoneNumber);
        if (!user || user.authProvider !== 'LOCAL' || user.status !== 'ACTIVE') {
            throw new Error('Invalid credentials');
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) throw new Error('Invalid credentials');

        await UserModel.recordLogin(user.id, user.metadata);
        if (user.userRole === 'LEARNER') {
            await EconomyService.processLoginStreak(user.id);
        }

        const { accessToken, refreshToken } = generateTokens(user.id, user.userRole);
        return {
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, phoneNumber: user.phoneNumber, userRole: user.userRole, orgId: user.orgId }
        };
    }

    static async refresh(refreshToken) {
        if (!refreshToken) throw new Error('Refresh token required');

        const decoded = verifyToken(refreshToken, true);
        const user = await UserModel.findById(decoded.id);
        if (!user || user.status !== 'ACTIVE') throw new Error('Invalid refresh token');

        const { accessToken } = generateTokens(user.id, user.userRole);
        return { accessToken };
    }

    static async logout(refreshToken) {

        return { message: 'Logged out' };
    }

    static async registerDevice(userId, deviceType, deviceToken) {
        if (!deviceType || !deviceToken) throw new Error('Device type and token required');

        const device = await prisma.device.create({
            data: { userId, deviceType, deviceToken, registeredAt: new Date() }
        });
        return { deviceId: device.id };
    }

    static async verifyMFA(userId, mfaToken, setup = false) {
        if (isProductionEnv() && !isFeatureEnabled('ENABLE_MFA')) {
            throw new Error('MFA is not configured');
        }

        const user = await UserModel.findById(userId);
        if (!user) throw new Error('User not found');

        if (setup) {
            throw new Error('MFA setup is not configured');
        }

        if (!mfaToken) throw new Error('MFA token required');
        throw new Error('MFA is not configured');
    }

    static async ssoCallback(code) {
        if (!code) throw new Error('Authorization code required');
        if (isProductionEnv() && !isFeatureEnabled('ENABLE_SSO')) {
            throw new Error('SSO is not configured');
        }
        throw new Error('SSO is not configured');
    }
}