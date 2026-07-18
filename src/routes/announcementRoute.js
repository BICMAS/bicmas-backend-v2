import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

import {
    createAnnouncement,
    getAnnouncements,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement
} from '../controllers/AnnouncementController.js';

const announcementRouter = Router();

const manageRoles = ['SUPER_ADMIN', 'HR_MANAGER'];

// POST – create announcement (admins/HR only)
announcementRouter.post(
    '/',
    authenticateToken,
    requireRole(manageRoles),
    createAnnouncement
);

// GET – paginated list (all authenticated users in org)
announcementRouter.get('/', authenticateToken, getAnnouncements);

// GET – single announcement
announcementRouter.get('/:id', authenticateToken, getAnnouncementById);

// PUT/PATCH – update announcement (admins/HR only)
announcementRouter.put(
    '/:id',
    authenticateToken,
    requireRole(manageRoles),
    updateAnnouncement
);
announcementRouter.patch(
    '/:id',
    authenticateToken,
    requireRole(manageRoles),
    updateAnnouncement
);

// DELETE – delete announcement (admins/HR only)
announcementRouter.delete(
    '/:id',
    authenticateToken,
    requireRole(manageRoles),
    deleteAnnouncement
);

export default announcementRouter;
