"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ModuleModel = void 0;
var _db = require("../utils/db.js");
class ModuleModel {
  static async findById(id) {
    return _db.prisma.module.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        courseId: true
      }
    });
  }
  static async delete(id) {
    console.log('[MODULE MODEL] Deleting ID:', id); // FIXED: Log before delete
    return _db.prisma.module.delete({
      where: {
        id
      }
    });
  }

  // ... other methods if needed
}
exports.ModuleModel = ModuleModel;