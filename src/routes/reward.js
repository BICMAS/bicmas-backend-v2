import { Router } from 'express';
import { awardPoints } from '../controllers/RewardController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const rewardRouter = Router();

rewardRouter.post('/award', authenticateToken, requireRole(['HR_MANAGER', 'SUPER_ADMIN']), awardPoints);

export default rewardRouter;