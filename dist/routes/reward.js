"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _RewardController = require("../controllers/RewardController.js");
var _authMiddleware = require("../middleware/authMiddleware.js");
const rewardRouter = (0, _express.Router)();
rewardRouter.post('/award', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['HR_MANAGER', 'SUPER_ADMIN']), _RewardController.awardPoints);
var _default = exports.default = rewardRouter;