"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CertificateTemplateModel = void 0;
var _db = require("../utils/db.js");
var _StorageService = require("../services/StorageService.js");
class CertificateTemplateModel {
  static async uploadAndSave(filePath, filename, mimeType, description, uploadedBy) {
    console.log('[CERT TEMPLATE MODEL] Uploading', filename);
    const objectKey = _StorageService.StorageService.buildObjectKey('certificates/templates', filename);
    await _StorageService.StorageService.uploadFile(objectKey, filePath, mimeType);
    const template = await _db.prisma.certificateTemplate.create({
      data: {
        filename,
        blobUrl: objectKey,
        mimeType,
        description,
        createdBy: uploadedBy
      },
      include: {
        creator: true
      }
    });
    return template;
  }
  static async findMany() {
    return _db.prisma.certificateTemplate.findMany({
      include: {
        creator: {
          select: {
            fullName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
  static async findById(id) {
    return _db.prisma.certificateTemplate.findUnique({
      where: {
        id
      },
      include: {
        creator: true
      }
    });
  }
  static async findLatest() {
    return _db.prisma.certificateTemplate.findFirst({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        creator: true
      }
    });
  }
}
exports.CertificateTemplateModel = CertificateTemplateModel;