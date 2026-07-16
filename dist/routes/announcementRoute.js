"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _authMiddleware = require("../middleware/authMiddleware.js");
var _AnnouncementController = require("../controllers/AnnouncementController.js");
const announcementRouter = (0, _express.Router)();

// POST – create announcement (admins/HR only)
announcementRouter.post('/', _authMiddleware.authenticateToken, (0, _authMiddleware.requireRole)(['SUPER_ADMIN', 'HR_MANAGER']), _AnnouncementController.createAnnouncement);

// GET – get recent announcements (visible to all authenticated users)
announcementRouter.get('/', _authMiddleware.authenticateToken, _AnnouncementController.getAnnouncements);
var _default = exports.default = announcementRouter;