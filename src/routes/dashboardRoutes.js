import { Router } from 'express';
import { getHRDashboard, getAllLearnersCourseTracking, getLearnerCourseTracking, getLearnerDashboard, getSuperAdminDashboard } from '../controllers/DashboardController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { log } from 'console';

const dashboardRouter = Router();
dashboardRouter.get('/hr', authenticateToken, requireRole('HR_MANAGER'), getHRDashboard);
dashboardRouter.get('/hr/learners/:learnerId/course-tracking', authenticateToken, requireRole('HR_MANAGER'), getLearnerCourseTracking);
dashboardRouter.get('/hr/learners/course-tracking', authenticateToken, requireRole('HR_MANAGER'), getAllLearnersCourseTracking);

dashboardRouter.get('/super', authenticateToken, requireRole('SUPER_ADMIN'), getSuperAdminDashboard);
dashboardRouter.get('/learner', authenticateToken, requireRole('LEARNER'), getLearnerDashboard);

export default dashboardRouter;