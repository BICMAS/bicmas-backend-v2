"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAssignedCourses = exports.createAssignments = void 0;
var _AssignmentService = require("../service/AssignmentService.js");
const createAssignments = async (req, res) => {
  try {
    const result = await _AssignmentService.AssignmentService.createAssignments(req.body, req.user);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};
exports.createAssignments = createAssignments;
const getAssignedCourses = async (req, res) => {
  try {
    const result = await _AssignmentService.AssignmentService.getAssignedCourses(req.user);
    res.json(result);
  } catch (error) {
    res.status(403).json({
      error: error.message
    });
  }
};
exports.getAssignedCourses = getAssignedCourses;