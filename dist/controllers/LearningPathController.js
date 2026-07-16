"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAllPaths = exports.createPath = void 0;
var _LearningPathService = require("../service/LearningPathService.js");
const createPath = async (req, res) => {
  try {
    const result = await _LearningPathService.LearningPathService.createPath(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};
exports.createPath = createPath;
const getAllPaths = async (req, res) => {
  try {
    const result = await _LearningPathService.LearningPathService.getAllPaths();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
exports.getAllPaths = getAllPaths;