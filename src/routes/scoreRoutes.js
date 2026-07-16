import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { getLeaderboard, getMyScores, getOrgScores } from '../controllers/ScoreController.js';

const scoreRouter = Router();

scoreRouter.get('/me', authenticateToken, requireRole(['LEARNER']), getMyScores);
scoreRouter.get('/org', authenticateToken, requireRole(['HR_MANAGER']), getOrgScores);
scoreRouter.get(
    '/leaderboard',
    authenticateToken,
    requireRole(['LEARNER', 'HR_MANAGER', 'SUPER_ADMIN']),
    getLeaderboard,
);

export default scoreRouter;
