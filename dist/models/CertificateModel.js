"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CertificateModel = void 0;
var _crypto = _interopRequireDefault(require("crypto"));
var _db = require("../utils/db.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const COURSE_TEMPLATE_EVENT = 'COURSE_TEMPLATE_ASSIGNED';
const ORG_TEMPLATE_EVENT = 'ORG_CERT_TEMPLATE_ASSIGNED';
class CertificateModel {
  static async findCertificateByUserAndCourse(userId, courseId) {
    return _db.prisma.certificate.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      }
    });
  }
  static async createCertificate({
    userId,
    courseId,
    templateId,
    pdfPath,
    issuedAt
  }) {
    return _db.prisma.certificate.create({
      data: {
        userId,
        courseId,
        templateId,
        pdfPath,
        issuedAt: issuedAt || new Date(),
        verificationHash: _crypto.default.randomUUID()
      }
    });
  }
  static async assignTemplateToCourse({
    courseId,
    templateId,
    actorId
  }) {
    const existing = await _db.prisma.auditLog.findFirst({
      where: {
        eventType: COURSE_TEMPLATE_EVENT,
        targetType: 'COURSE',
        targetId: courseId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    const payload = {
      courseId,
      templateId
    };
    if (existing) {
      return _db.prisma.auditLog.update({
        where: {
          id: existing.id
        },
        data: {
          actorId,
          payload
        }
      });
    }
    return _db.prisma.auditLog.create({
      data: {
        eventType: COURSE_TEMPLATE_EVENT,
        actorId,
        targetType: 'COURSE',
        targetId: courseId,
        payload
      }
    });
  }
  static async getAssignedTemplateForCourse(courseId) {
    const log = await _db.prisma.auditLog.findFirst({
      where: {
        eventType: COURSE_TEMPLATE_EVENT,
        targetType: 'COURSE',
        targetId: courseId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    if (!log?.payload || typeof log.payload !== 'object') return null;
    return log.payload?.templateId || null;
  }
  static async assignTemplateToOrgHR({
    orgId,
    hrManagerId,
    templateId,
    actorId
  }) {
    return _db.prisma.auditLog.create({
      data: {
        eventType: ORG_TEMPLATE_EVENT,
        actorId,
        targetType: 'ORGANIZATION',
        targetId: orgId,
        payload: {
          orgId,
          hrManagerId,
          templateId
        }
      }
    });
  }
  static async getAssignedTemplateForHR(orgId, hrManagerId) {
    const logs = await _db.prisma.auditLog.findMany({
      where: {
        eventType: ORG_TEMPLATE_EVENT,
        targetType: 'ORGANIZATION',
        targetId: orgId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });
    const match = logs.find(log => {
      const payload = log?.payload;
      return payload && typeof payload === 'object' && payload.hrManagerId === hrManagerId;
    });
    if (!match?.payload || typeof match.payload !== 'object') return null;
    return match.payload?.templateId || null;
  }
}
exports.CertificateModel = CertificateModel;