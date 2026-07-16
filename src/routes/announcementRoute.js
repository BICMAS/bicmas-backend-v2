import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

import { createAnnouncement, getAnnouncements } from '../controllers/AnnouncementController.js';

const announcementRouter = Router();

// POST – create announcement (admins/HR only)
announcementRouter.post(
    '/',
    authenticateToken,
    requireRole(['SUPER_ADMIN', 'HR_MANAGER']),
    createAnnouncement
);

// GET – get recent announcements (visible to all authenticated users)
announcementRouter.get('/', authenticateToken, getAnnouncements);

export default announcementRouter;