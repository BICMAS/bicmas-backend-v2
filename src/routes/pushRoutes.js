import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getVapidPublicKey, subscribePush, unsubscribePush } from '../controllers/PushController.js';

const pushRouter = Router();

pushRouter.get('/vapid-public-key', getVapidPublicKey);
pushRouter.post('/subscribe', authenticateToken, subscribePush);
pushRouter.delete('/subscribe', authenticateToken, unsubscribePush);

export default pushRouter;
