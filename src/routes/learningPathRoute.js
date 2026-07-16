import { Router } from 'express';
import { createPath, getAllPaths } from '../controllers/LearningPathController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const learningPathRouter = Router();

learningPathRouter.post('/', authenticateToken, requireRole(['SUPER_ADMIN']), createPath);
learningPathRouter.get('/', authenticateToken, getAllPaths);
export default learningPathRouter;