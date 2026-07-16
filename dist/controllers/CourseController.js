"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updateCourse = exports.publishCourse = exports.getCourses = exports.getCourseById = exports.deleteModule = exports.deleteCourse = exports.createDraft = void 0;
var _CourseService = require("../service/CourseService.js");
var _authMiddleware = require("../middleware/authMiddleware.js");
const getCourses = async (req, res) => {
  try {
    const courses = await _CourseService.CourseService.getCourses();
    res.json(courses);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
exports.getCourses = getCourses;
const getCourseById = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const course = await _CourseService.CourseService.getCourseById(id);
    res.json(course);
  } catch (error) {
    res.status(404).json({
      error: error.message
    });
  }
};
exports.getCourseById = getCourseById;
const createDraft = async (req, res) => {
  try {
    const result = await _CourseService.CourseService.createDraft(req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};
exports.createDraft = createDraft;
const updateCourse = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const result = await _CourseService.CourseService.updateCourse(id, req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};
exports.updateCourse = updateCourse;
const publishCourse = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const result = await _CourseService.CourseService.publishCourse(id, req.body, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};
exports.publishCourse = publishCourse;
const deleteCourse = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    console.log('[COURSE CTRL] Delete course request ID:', id);
    const result = await _CourseService.CourseService.deleteCourse(id, req.user);
    res.json(result);
  } catch (error) {
    console.error('[COURSE CTRL ERROR deleteCourse]', error.message);
    res.status(404).json({
      error: error.message
    });
  }
};
exports.deleteCourse = deleteCourse;
const deleteModule = async (req, res) => {
  try {
    const {
      courseId,
      moduleId
    } = req.params;
    console.log('[COURSE CTRL] Delete module request:', {
      courseId,
      moduleId
    });
    const result = await _CourseService.CourseService.deleteModule(courseId, moduleId, req.user);
    res.json(result);
  } catch (error) {
    console.error('[COURSE CTRL ERROR deleteModule]', error.message);
    res.status(404).json({
      error: error.message
    });
  }
};
exports.deleteModule = deleteModule;