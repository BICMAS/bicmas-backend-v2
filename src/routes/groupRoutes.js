import { Router } from 'express';
import { getGroups, createGroup, addGroupMember } from '../controllers/GroupController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const groupRouter = Router();

groupRouter.get('/', authenticateToken, getGroups);
groupRouter.post('/', authenticateToken, requireRole(['SUPER_ADMIN', 'HR_MANAGER']), createGroup);
groupRouter.post('/:id/members', authenticateToken, requireRole(['SUPER_ADMIN', 'HR_MANAGER']), addGroupMember);

export default groupRouter;
