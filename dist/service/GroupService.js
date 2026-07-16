"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GroupService = void 0;
var _GroupModel = require("../models/GroupModel.js");
var _db = require("../utils/db.js");
class GroupService {
  static async getGroups() {
    return await _GroupModel.GroupModel.findMany();
  }
  static async createGroup(data) {
    if (!data.name) throw new Error('Group name required');
    return await _GroupModel.GroupModel.create(data);
  }
  static async addGroupMember(groupId, userId, role = 'MEMBER') {
    const group = await _GroupModel.GroupModel.findMany({
      where: {
        id: groupId
      }
    });
    if (group.length === 0) throw new Error('Group not found');
    const existing = await _db.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      }
    });
    if (existing) throw new Error('User already a member');
    return await _GroupModel.GroupModel.addMember(groupId, userId, role);
  }
}
exports.GroupService = GroupService;