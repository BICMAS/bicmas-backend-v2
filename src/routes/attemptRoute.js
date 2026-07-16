import { Router } from 'express';
import { syncScormProgress, updateProgress, retakeCourse } from '../controllers/AttemptController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const attemptRouter = Router();

attemptRouter.post('/courses/:courseId/retake', authenticateToken, retakeCourse);
attemptRouter.patch('/:courseId', authenticateToken, updateProgress);
attemptRouter.patch('/:scormAttemptId/sync-progress', authenticateToken, syncScormProgress);

export default attemptRouter;