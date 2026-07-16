"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ScormService = void 0;
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
var _ScormPackageModel = require("../models/ScormPackageModel.js");
var _ScormCloudService = require("../services/ScormCloudService.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
class ScormService {
  /**
   * Upload SCORM package (via SCORM Cloud)
   */
  static async uploadPackage(tempPath, filename, uploadedBy) {
    console.log('[SCORM SERVICE] Uploading package via SCORM Cloud...');

    // Validate file
    if (!_fs.default.existsSync(tempPath)) {
      throw new Error('Temporary file not found');
    }

    // Validate file size (SCORM Cloud has limits)
    const stats = _fs.default.statSync(tempPath);
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (stats.size > maxSize) {
      throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
    }
    if (stats.size === 0) {
      throw new Error('File is empty');
    }

    // Upload via model (which uses SCORM Cloud)
    const result = await _ScormPackageModel.ScormPackageModel.uploadAndExtract(tempPath, filename, uploadedBy);
    return result;
  }

  /**
   * Get launch URL for a SCORM package
   */
  static async getLaunchUrl(packageId, userId, userFullName, options = {}) {
    console.log('[SCORM SERVICE] Getting launch URL...');
    if (!packageId || !userId) {
      throw new Error('Package ID and User ID are required');
    }
    const launchUrl = await _ScormPackageModel.ScormPackageModel.getLaunchUrl(packageId, userId, userFullName, options);
    return launchUrl;
  }

  /**
   * Get user progress for a package
   */
  static async getUserProgress(packageId, userId) {
    console.log('[SCORM SERVICE] Getting progress for user:', userId);
    const progress = await _ScormPackageModel.ScormPackageModel.getUserProgress(packageId, userId);
    return progress;
  }

  /**
   * Get manifest (compatibility method - returns basic info)
   */
  static async getManifest(id) {
    console.log('[SCORM SERVICE] Getting manifest info for:', id);
    const pkg = await _ScormPackageModel.ScormPackageModel.findById(id);
    if (!pkg) {
      throw new Error('Package not found');
    }

    // Try to fetch details from SCORM Cloud
    let scormCloudDetails = null;
    if (pkg.scormCloudId) {
      try {
        scormCloudDetails = await _ScormCloudService.ScormCloudService.getCourse(pkg.scormCloudId);
      } catch (error) {
        console.warn('[SCORM SERVICE] Failed to fetch SCORM Cloud details:', error.message);
      }
    }
    return {
      id: pkg.id,
      filename: pkg.filename,
      storagePath: pkg.storagePath,
      scormVersion: pkg.scormVersion,
      scormCloudId: pkg.scormCloudId,
      uploadedAt: pkg.uploadedAt,
      packageSize: pkg.packageSize,
      scormCloudDetails,
      message: 'Manifest is managed by SCORM Cloud'
    };
  }
  static async getPackages(options = {}) {
    return _ScormPackageModel.ScormPackageModel.findAll(options);
  }
  static async getPackagesByUploader(userId, options = {}) {
    return _ScormPackageModel.ScormPackageModel.findByUploader(userId, options);
  }
  static async getPackage(id) {
    const pkg = await _ScormPackageModel.ScormPackageModel.findById(id);
    if (!pkg) {
      throw new Error('Package not found');
    }
    let scormCloudDetails = null;
    if (pkg.scormCloudId) {
      try {
        scormCloudDetails = await _ScormCloudService.ScormCloudService.getCourse(pkg.scormCloudId);
      } catch (error) {
        console.warn('[SCORM SERVICE] Failed to fetch SCORM Cloud details:', error.message);
      }
    }
    return {
      ...pkg,
      scormCloudDetails
    };
  }
  static async getPackageStatistics(id) {
    return _ScormPackageModel.ScormPackageModel.getStatistics(id);
  }
  static async deletePackage(id, userId) {
    return _ScormPackageModel.ScormPackageModel.delete(id, userId);
  }
  static async bulkDeletePackages(ids, userId) {
    return _ScormPackageModel.ScormPackageModel.bulkDelete(ids, userId);
  }
  static async updatePackage(id, data, userId) {
    return _ScormPackageModel.ScormPackageModel.update(id, data, userId);
  }
  static async testScormCloudConnection() {
    return _ScormCloudService.ScormCloudService.testConnection();
  }
  static async setupWebhook(webhookUrl, events) {
    return _ScormCloudService.ScormCloudService.setupWebhook(webhookUrl, events);
  }
  static async validatePackage(tempPath) {
    const stats = _fs.default.statSync(tempPath);
    return {
      isValid: stats.size > 0 && stats.size <= 500 * 1024 * 1024,
      size: stats.size,
      sizeMB: (stats.size / 1024 / 1024).toFixed(2),
      maxSizeMB: 500
    };
  }
  static async searchPackages(query, options = {}) {
    return _ScormPackageModel.ScormPackageModel.findAll({
      ...options,
      search: query
    });
  }
  static async getRecentPackages(limit = 10) {
    const result = await _ScormPackageModel.ScormPackageModel.findAll({
      limit,
      offset: 0
    });
    return result.packages;
  }
  static async canAccessPackage(packageId, userId) {
    try {
      const pkg = await _ScormPackageModel.ScormPackageModel.findById(packageId);
      if (!pkg) return false;
      const attempt = await prisma.attempt.findFirst({
        where: {
          scormPackageId: packageId,
          userId: userId
        }
      });
      return pkg.uploadedBy === userId || !!attempt;
    } catch (error) {
      console.error('[SCORM SERVICE] Access check error:', error.message);
      return false;
    }
  }
}
exports.ScormService = ScormService;