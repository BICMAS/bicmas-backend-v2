"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getGroups = exports.createGroup = exports.addGroupMember = void 0;
var _GroupService = require("../service/GroupService.js");
const getGroups = async (req, res) => {
  try {
    const groups = await _GroupService.GroupService.getGroups();
    res.json(groups);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
exports.getGroups = getGroups;
const createGroup = async (req, res) => {
  try {
    const result = await _GroupService.GroupService.createGroup(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};
exports.createGroup = createGroup;
const addGroupMember = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const {
      userId,
      role
    } = req.body;
    const result = await _GroupService.GroupService.addGroupMember(id, userId, role);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};
exports.addGroupMember = addGroupMember;