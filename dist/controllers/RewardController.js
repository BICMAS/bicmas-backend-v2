"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.awardPoints = void 0;
var _RewardService = require("../service/RewardService.js");
const awardPoints = async (req, res) => {
  try {
    const {
      learnerId,
      points
    } = req.body;
    const result = await _RewardService.RewardService.awardPoints(learnerId, points, req.user);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};
exports.awardPoints = awardPoints;