"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CertificateTemplateService = void 0;
var _CertificateTemplateModel = require("../models/CertificateTemplateModel.js");
var _CertificateModel = require("../models/CertificateModel.js");
var _CourseModel = require("../models/CourseModel.js");
var _UserModel = require("../models/UserModel.js");
var _AssignmentModel = require("../models/AssignmentModel.js");
var _AttemptModel = require("../models/AttemptModel.js");
var _CertificatePdfService = require("./CertificatePdfService.js");
class CertificateTemplateService {
  static async uploadTemplate(filePath, filename, description, uploadedBy) {
    if (!uploadedBy) throw new Error('Uploader ID required');
    if (!filename) throw new Error('Filename required');
    if (!filename.endsWith('.pdf')) {
      // FIXED: PDF only
      throw new Error('Only PDF templates allowed');
    }
    const mimeType = 'application/pdf';
    const result = await _CertificateTemplateModel.CertificateTemplateModel.uploadAndSave(filePath, filename, mimeType, description, uploadedBy);
    return result;
  }
  static async getTemplateById(id) {
    if (!id) throw new Error('Template ID required');
    const template = await _CertificateTemplateModel.CertificateTemplateModel.findById(id);
    if (!template) throw new Error('Certificate template not found');
    return template;
  }
  static async getLatestTemplate() {
    const template = await _CertificateTemplateModel.CertificateTemplateModel.findLatest();
    if (!template) throw new Error('No certificate templates found');
    return template;
  }
  static async assignTemplateToCourse(courseId, templateId, actorId, requester) {
    if (!courseId) throw new Error('Course ID required');
    if (!templateId) throw new Error('Template ID required');
    if (!actorId) throw new Error('Actor ID required');
    const [course, template] = await Promise.all([_CourseModel.CourseModel.findById(courseId), _CertificateTemplateModel.CertificateTemplateModel.findById(templateId)]);
    if (!course) throw new Error('Course not found');
    if (!template) throw new Error('Certificate template not found');
    if (requester?.userRole === 'HR_MANAGER') {
      if (!requester.orgId) throw new Error('HR must be in an organization');
      const assignedTemplateId = await _CertificateModel.CertificateModel.getAssignedTemplateForHR(requester.orgId, actorId);
      if (!assignedTemplateId) throw new Error('No certificate template assigned to HR manager');
      if (assignedTemplateId !== templateId) {
        throw new Error('HR manager can only assign their allocated certificate template');
      }
    }
    await _CertificateModel.CertificateModel.assignTemplateToCourse({
      courseId,
      templateId,
      actorId
    });
    return {
      courseId,
      templateId
    };
  }
  static async assignTemplateToHRManager({
    templateId,
    orgId,
    hrManagerId,
    actorId
  }) {
    if (!templateId) throw new Error('Template ID required');
    if (!orgId) throw new Error('Organization ID required');
    if (!hrManagerId) throw new Error('HR Manager ID required');
    if (!actorId) throw new Error('Actor ID required');
    const [template, hrManager] = await Promise.all([_CertificateTemplateModel.CertificateTemplateModel.findById(templateId), _UserModel.UserModel.findById(hrManagerId)]);
    if (!template) throw new Error('Certificate template not found');
    if (!hrManager) throw new Error('HR manager not found');
    if (hrManager.userRole !== 'HR_MANAGER') throw new Error('User must be an HR manager');
    if (hrManager.orgId !== orgId) throw new Error('HR manager does not belong to the provided organization');
    await _CertificateModel.CertificateModel.assignTemplateToOrgHR({
      orgId,
      hrManagerId,
      templateId,
      actorId
    });
    return {
      templateId,
      orgId,
      hrManagerId
    };
  }
  static async getAssignedTemplateForHRManager(hrManagerId, orgId) {
    if (!hrManagerId) throw new Error('HR Manager ID required');
    if (!orgId) throw new Error('HR must be in an organization');
    const templateId = await _CertificateModel.CertificateModel.getAssignedTemplateForHR(orgId, hrManagerId);
    if (!templateId) throw new Error('No certificate template assigned to this HR manager');
    const template = await _CertificateTemplateModel.CertificateTemplateModel.findById(templateId);
    if (!template) throw new Error('Certificate template not found');
    return {
      orgId,
      hrManagerId,
      templateId,
      template
    };
  }
  static async getAssignedTemplateForCourse(courseId) {
    if (!courseId) throw new Error('Course ID required');
    const course = await _CourseModel.CourseModel.findById(courseId);
    if (!course) throw new Error('Course not found');
    const templateId = await _CertificateModel.CertificateModel.getAssignedTemplateForCourse(courseId);
    if (!templateId) throw new Error('No template assigned to course');
    const template = await _CertificateTemplateModel.CertificateTemplateModel.findById(templateId);
    if (!template) throw new Error('Certificate template not found');
    return {
      courseId,
      templateId,
      template
    };
  }
  static async issueCertificate({
    userId,
    courseId,
    issuerId,
    templateId,
    requester
  }) {
    if (!userId) throw new Error('User ID required');
    if (!courseId) throw new Error('Course ID required');
    if (!issuerId) throw new Error('Issuer ID required');
    const [user, course] = await Promise.all([_UserModel.UserModel.findById(userId), _CourseModel.CourseModel.findById(courseId)]);
    if (!user) throw new Error('User not found');
    if (!course) throw new Error('Course not found');
    if (requester?.userRole === 'HR_MANAGER') {
      if (!requester.orgId) throw new Error('HR must be in an organization');
      if (user.orgId !== requester.orgId) {
        throw new Error('HR manager can only issue certificates to learners in their organization');
      }
    }
    const assignedTemplateId = await _CertificateModel.CertificateModel.getAssignedTemplateForCourse(courseId);
    const resolvedTemplateId = templateId || assignedTemplateId;
    if (!resolvedTemplateId) {
      throw new Error('No template assigned to course');
    }
    const template = await _CertificateTemplateModel.CertificateTemplateModel.findById(resolvedTemplateId);
    if (!template) throw new Error('Certificate template not found');
    const existing = await _CertificateModel.CertificateModel.findCertificateByUserAndCourse(userId, courseId);
    if (existing) throw new Error('Certificate already issued for this user and course');
    const issuedAt = new Date();
    const generatedPdf = await _CertificatePdfService.CertificatePdfService.generateAndUpload({
      templateUrl: template.blobUrl,
      traineeName: user.fullName,
      courseTitle: course.title,
      issuedAt
    });
    const certificate = await _CertificateModel.CertificateModel.createCertificate({
      userId,
      courseId,
      templateId: resolvedTemplateId,
      pdfPath: generatedPdf.blobUrl,
      issuedAt
    });
    return {
      ...certificate,
      issuedBy: issuerId
    };
  }
  static async claimLearnerCertificate(learnerId, courseId) {
    if (!learnerId) throw new Error('Learner ID required');
    if (!courseId) throw new Error('Course ID required');
    const assignment = await _AssignmentModel.AssignmentModel.findByCourseAndLearner(courseId, learnerId);
    if (!assignment) {
      throw new Error('Course not assigned to learner');
    }
    const attempt = await _AttemptModel.AttemptModel.findByUserAndCourse(learnerId, courseId);
    const isCompleted = !!attempt && (attempt.status === 'COMPLETED' || Number(attempt.completionPercentage || 0) >= 100);
    if (!isCompleted) {
      throw new Error('Course not yet completed');
    }
    const existing = await _CertificateModel.CertificateModel.findCertificateByUserAndCourse(learnerId, courseId);
    if (existing) {
      return {
        certificate: existing,
        issued: false
      };
    }
    const created = await this.issueCertificate({
      userId: learnerId,
      courseId,
      issuerId: learnerId,
      requester: {
        userRole: 'LEARNER'
      }
    });
    return {
      certificate: created,
      issued: true
    };
  }
}
exports.CertificateTemplateService = CertificateTemplateService;