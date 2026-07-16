import { AuthService } from '../service/AuthService.js';

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await AuthService.login(email, password);
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

export const ssoCallback = async (req, res) => {
    try {
        const { code } = req.body;
        const result = await AuthService.ssoCallback(code);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const phoneLogin = async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const result = await AuthService.phoneLogin({ phoneNumber, password });
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

export const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const result = await AuthService.refresh(refreshToken);
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        await AuthService.logout(refreshToken);
        res.json({ message: 'Logged out' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const registerDevice = async (req, res) => {
    try {
        const { deviceType, deviceToken } = req.body;
        const result = await AuthService.registerDevice(req.user.id, deviceType, deviceToken);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const verifyMFA = async (req, res) => {
    try {
        const { mfaToken, setup } = req.body;
        const result = await AuthService.verifyMFA(req.user.id, mfaToken, setup);
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};