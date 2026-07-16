"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAnnouncements = exports.createAnnouncement = void 0;
var _db = require("../utils/db.js");
// Post a new announcement (admin/HR only)
const createAnnouncement = async (req, res) => {
  try {
    const {
      text
    } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Announcement text is required'
      });
    }
    const userId = req.user.id;
    const userOrgId = req.user.orgId;
    if (!['SUPER_ADMIN', 'HR_MANAGER'].includes(req.user.userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Only admins or HR can post announcements'
      });
    }

    // Enforce org-scoped announcements.
    if (!userOrgId) {
      return res.status(400).json({
        success: false,
        error: 'User must belong to an organization to post announcements'
      });
    }
    const announcement = await _db.prisma.announcement.create({
      data: {
        text: text.trim(),
        createdBy: userId
      },
      select: {
        id: true,
        text: true,
        createdAt: true,
        user: {
          // ← FIXED: user, not createdByUser
          select: {
            fullName: true,
            userRole: true
          }
        }
      }
    });
    res.status(201).json({
      success: true,
      data: announcement,
      message: 'Announcement posted successfully'
    });
  } catch (error) {
    console.error('[CREATE ANNOUNCEMENT ERROR]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create announcement'
    });
  }
};

// Get announcements (as notifications) – visible to everyone
exports.createAnnouncement = createAnnouncement;
const getAnnouncements = async (req, res) => {
  try {
    const {
      limit = 10,
      offset = 0
    } = req.query;
    const userOrgId = req.user.orgId;
    const requestedOrgId = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : null;
    const effectiveOrgId = req.user.userRole === 'SUPER_ADMIN' && requestedOrgId ? requestedOrgId : userOrgId;
    if (!effectiveOrgId) {
      return res.status(400).json({
        success: false,
        error: 'User must belong to an organization to view announcements'
      });
    }
    const announcements = await _db.prisma.announcement.findMany({
      where: {
        user: {
          orgId: effectiveOrgId
        }
      },
      skip: parseInt(offset),
      take: parseInt(limit),
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        text: true,
        createdAt: true,
        user: {
          // ← FIXED: user, not createdByUser
          select: {
            fullName: true,
            userRole: true
          }
        }
      }
    });
    const total = await _db.prisma.announcement.count({
      where: {
        user: {
          orgId: effectiveOrgId
        }
      }
    });
    res.json({
      success: true,
      data: announcements,
      meta: {
        orgId: effectiveOrgId,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pageCount: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[GET ANNOUNCEMENTS ERROR]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch announcements'
    });
  }
};
exports.getAnnouncements = getAnnouncements;