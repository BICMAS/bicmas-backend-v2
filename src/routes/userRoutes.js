import { Router } from 'express';
import { getUser, createUser, updateUser, bulkUpload, getAllUsers, getCurrentOrgUsers, blockUser, unblockUser, deleteUser } from '../controllers/UserController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const userRouter = Router();

// Public
userRouter.post('/', authenticateToken, requireRole(['SUPER_ADMIN', "HR_MANAGER"]), createUser);

// Protected
userRouter.get('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'HR_MANAGER']), getUser);
userRouter.put('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'HR_MANAGER']), updateUser);
userRouter.post('/bulk-upload', authenticateToken, requireRole(['SUPER_ADMIN', 'HR_MANAGER']), bulkUpload);
userRouter.get('/', authenticateToken, requireRole(['SUPER_ADMIN']), getAllUsers);
userRouter.get('/organization/users', authenticateToken, getCurrentOrgUsers);

// SUPER_ADMIN actions
userRouter.patch('/:id/block', authenticateToken, requireRole(['SUPER_ADMIN']), blockUser);
userRouter.patch('/:id/unblock', authenticateToken, requireRole(['SUPER_ADMIN']), unblockUser);
userRouter.delete('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'HR_MANAGER']), deleteUser);
export default userRouter;