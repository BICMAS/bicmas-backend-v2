import { Router } from 'express';
import { createAssignments, getAssignedCourses } from '../controllers/AssignmentController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const assignmentRouter = Router();

assignmentRouter.post('/', authenticateToken, requireRole(['HR_MANAGER', 'SUPER_ADMIN']), createAssignments);
assignmentRouter.get('/assigned-courses', authenticateToken, requireRole(['LEARNER']), getAssignedCourses);
export default assignmentRouter;