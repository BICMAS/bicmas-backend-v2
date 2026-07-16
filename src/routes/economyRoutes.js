import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { getEconomyRules, updateEconomyRules } from '../controllers/EconomyController.js';

const economyRouter = Router();

economyRouter.get('/rules', authenticateToken, getEconomyRules);
economyRouter.put('/rules', authenticateToken, requireRole(['SUPER_ADMIN']), updateEconomyRules);

export default economyRouter;
