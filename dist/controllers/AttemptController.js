"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updateProgress = exports.syncScormProgress = void 0;
var _AttemptService = require("../service/AttemptService.js");
const updateProgress = async (req, res) => {
  try {
    const {
      courseId
    } = req.params;
    const {
      completionPercentage,
      status,
      notes
    } = req.body;
    const result = await _AttemptService.AttemptService.updateProgress(courseId, {
      completionPercentage,
      status,
      notes
    }, req.user);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};
exports.updateProgress = updateProgress;
const syncScormProgress = async (req, res) => {
  try {
    const {
      scormAttemptId
    } = req.params;
    const updated = await _AttemptService.AttemptService.syncScormProgress(scormAttemptId, req.user);
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('[SCORM SYNC ERROR]', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
exports.syncScormProgress = syncScormProgress;