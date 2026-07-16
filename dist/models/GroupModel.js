"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GroupModel = void 0;
var _db = require("../utils/db.js");
class GroupModel {
  static async findMany() {
    return _db.prisma.group.findMany({
      include: {
        members: true
      }
    });
  }
  static async create(data) {
    return _db.prisma.group.create({
      data
    });
  }
  static async addMember(groupId, userId, role = 'MEMBER') {
    return _db.prisma.groupMember.create({
      data: {
        groupId,
        userId,
        role
      }
    });
  }
}
exports.GroupModel = GroupModel;