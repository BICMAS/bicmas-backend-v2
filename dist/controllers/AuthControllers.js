"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.verifyMFA = exports.ssoCallback = exports.registerDevice = exports.refresh = exports.phoneLogin = exports.logout = exports.login = void 0;
var _AuthService = require("../service/AuthService.js");
const login = async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;
    const result = await _AuthService.AuthService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({
      error: error.message
    });
  }
};
exports.login = login;
const ssoCallback = async (req, res) => {
  try {
    const {
      code
    } = req.body;
    const result = await _AuthService.AuthService.ssoCallback(code);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};
exports.ssoCallback = ssoCallback;
const phoneLogin = async (req, res) => {
  try {
    const {
      phoneNumber,
      password
    } = req.body;
    const result = await _AuthService.AuthService.phoneLogin({
      phoneNumber,
      password
    });
    res.json(result);
  } catch (error) {
    res.status(401).json({
      error: error.message
    });
  }
};
exports.phoneLogin = phoneLogin;
const refresh = async (req, res) => {
  try {
    const {
      refreshToken
    } = req.body;
    const result = await _AuthService.AuthService.refresh(refreshToken);
    res.json(result);
  } catch (error) {
    res.status(401).json({
      error: error.message
    });
  }
};
exports.refresh = refresh;
const logout = async (req, res) => {
  try {
    const {
      refreshToken
    } = req.body;
    await _AuthService.AuthService.logout(refreshToken);
    res.json({
      message: 'Logged out'
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
exports.logout = logout;
const registerDevice = async (req, res) => {
  try {
    const {
      deviceType,
      deviceToken
    } = req.body;
    const result = await _AuthService.AuthService.registerDevice(req.user.id, deviceType, deviceToken);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};
exports.registerDevice = registerDevice;
const verifyMFA = async (req, res) => {
  try {
    const {
      mfaToken,
      setup
    } = req.body;
    const result = await _AuthService.AuthService.verifyMFA(req.user.id, mfaToken, setup);
    res.json(result);
  } catch (error) {
    res.status(401).json({
      error: error.message
    });
  }
};
exports.verifyMFA = verifyMFA;