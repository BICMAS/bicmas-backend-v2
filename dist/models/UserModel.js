"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UserModel = void 0;
var _db = require("../utils/db.js");
class UserModel {
  static async findByEmail(email) {
    return _db.prisma.user.findUnique({
      where: {
        email
      }
    });
  }
  static async findById(id) {
    return _db.prisma.user.findUnique({
      where: {
        id
      }
    });
  }
  static async update(id, updates) {
    return _db.prisma.user.update({
      where: {
        id
      },
      data: updates
    });
  }
  static async deleteById(id) {
    return _db.prisma.user.delete({
      where: {
        id
      }
    });
  }
  static async findByPhone(phoneNumber) {
    return _db.prisma.user.findUnique({
      where: {
        phoneNumber
      }
    });
  }
  static async findAll(requesterRole, requesterOrgId = null) {
    const where = requesterRole === 'SUPER_ADMIN' ? {} : {
      orgId: requesterOrgId
    };
    return _db.prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        userRole: true,
        status: true,
        orgId: true
      }
    });
  }
  static async findMany() {
    return _db.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        userRole: true,
        status: true
      }
    });
  }
  static async create(data) {
    return _db.prisma.user.create({
      data
    });
  }
  static async findManyByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return _db.prisma.user.findMany({
      where: {
        id: {
          in: ids
        }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        userRole: true,
        orgId: true,
        status: true
      }
    });
  }
  static async findByOrgId(orgId) {
    console.log(`[MODEL] Finding users by orgId: ${orgId}`);
    return _db.prisma.user.findMany({
      where: {
        orgId
      }
    });
  }
  static async findLearnersByOrgId(orgId) {
    console.log(`[MODEL] Finding learners by orgId: ${orgId}`);
    return _db.prisma.user.findMany({
      where: {
        orgId,
        userRole: 'LEARNER'
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        userRole: true,
        status: true,
        orgId: true,
        department: true
      }
    });
  }
  static async bulkCreate(csvData) {
    return _db.prisma.user.createMany({
      data: csvData,
      skipDuplicates: true
    });
  }
  static async updatePoints(id, points) {
    return _db.prisma.user.update({
      where: {
        id
      },
      data: {
        points: {
          increment: points
        }
      },
      select: {
        id: true,
        fullName: true,
        points: true,
        status: true,
        userRole: true
      }
    });
  }
}
exports.UserModel = UserModel;