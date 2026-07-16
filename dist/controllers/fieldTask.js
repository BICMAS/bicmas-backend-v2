"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getMyFieldTasks = exports.getAllFieldTasks = exports.createFieldTask = void 0;
var _StorageService = require("../services/StorageService.js");
var _db = require("../utils/db.js");
const createFieldTask = async (req, res) => {
  try {
    const {
      moduleTitle,
      description
    } = req.body;
    const file = req.file;
    if (!description?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Description is required'
      });
    }
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Media file is required'
      });
    }
    const userId = req.user.id;
    const userOrgId = req.user.orgId;
    if (!userOrgId) {
      return res.status(400).json({
        success: false,
        error: 'User must belong to an organization'
      });
    }
    const objectKey = _StorageService.StorageService.buildObjectKey(`field-tasks/${userId}`, file.originalname);
    await _StorageService.StorageService.uploadBuffer(objectKey, file.buffer, file.mimetype);
    const fieldTask = await _db.prisma.fieldTask.create({
      data: {
        moduleTitle: moduleTitle?.trim() || null,
        description: description.trim(),
        mediaUrl: objectKey,
        mediaType: file.mimetype.startsWith('image') ? 'image' : 'video',
        createdBy: userId
      }
    });
    res.status(201).json({
      success: true,
      data: {
        ...fieldTask,
        mediaUrl: await _StorageService.StorageService.resolveStorageUrl(fieldTask.mediaUrl)
      },
      message: 'Field task submitted successfully'
    });
  } catch (error) {
    console.error('[FIELD TASK CREATE ERROR]', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
exports.createFieldTask = createFieldTask;
const getMyFieldTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const userOrgId = req.user.orgId;
    if (!userOrgId) {
      return res.status(400).json({
        success: false,
        error: 'User must belong to an organization'
      });
    }
    const tasks = await _db.prisma.fieldTask.findMany({
      where: {
        createdBy: userId,
        user: {
          orgId: userOrgId
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        moduleTitle: true,
        description: true,
        mediaUrl: true,
        mediaType: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json({
      success: true,
      data: await _StorageService.StorageService.resolveStorageUrls(tasks, ['mediaUrl'])
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
exports.getMyFieldTasks = getMyFieldTasks;
const getAllFieldTasks = async (req, res) => {
  try {
    const userOrgId = req.user.orgId;
    const requestedOrgId = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : null;
    const effectiveOrgId = req.user.userRole === 'SUPER_ADMIN' && requestedOrgId ? requestedOrgId : userOrgId;
    if (!effectiveOrgId) {
      return res.status(400).json({
        success: false,
        error: 'User must belong to an organization'
      });
    }
    const {
      limit = 50,
      offset = 0
    } = req.query;
    const take = parseInt(limit, 10);
    const skip = parseInt(offset, 10);
    const tasks = await _db.prisma.fieldTask.findMany({
      where: {
        user: {
          orgId: effectiveOrgId
        }
      },
      skip,
      take,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            userRole: true
          }
        }
      }
    });
    const total = await _db.prisma.fieldTask.count({
      where: {
        user: {
          orgId: effectiveOrgId
        }
      }
    });
    res.json({
      success: true,
      data: await _StorageService.StorageService.resolveStorageUrls(tasks, ['mediaUrl']),
      meta: {
        orgId: effectiveOrgId,
        total,
        limit: take,
        offset: skip,
        pageCount: take > 0 ? Math.ceil(total / take) : 0
      }
    });
  } catch (error) {
    console.error('[GET ALL FIELD TASKS ERROR]', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
exports.getAllFieldTasks = getAllFieldTasks;