import { Router } from 'express';
import authRouter from './authRoutes.js';
import userRouter from './userRoutes.js';
import courseRouter from './courseRoutes.js';
import scormRouter from './scormRoutes.js';
import groupRouter from './groupRoutes.js';
import assignmentRouter from './assignmentRoutes.js';
import dashboardRouter from './dashboardRoutes.js';
import learningPathRouter from './learningPathRoute.js';
import certificateRouter from './certificateRouter.js';
import rewardRouter from './reward.js';
import economyRouter from './economyRoutes.js';
import scoreRouter from './scoreRoutes.js';
import attemptRouter from './attemptRoute.js';
import scormCallbackRouter from './scorm-callback.js';
import fieldRouter from './fieldTask.js';
import announcementRouter from './announcementRoute.js';
import pushRouter from './pushRoutes.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/groups', groupRouter);
router.use('/courses', courseRouter);
router.use('/scorm-packages', scormRouter)
router.use('/assignments', assignmentRouter);
router.use('/dashboard', dashboardRouter);
router.use('/learning-paths', learningPathRouter);
router.use('/certificates', certificateRouter);
router.use('/rewards', rewardRouter);
router.use('/economy', economyRouter);
router.use('/scores', scoreRouter);
router.use('/attempts', attemptRouter);
router.use('/scorm-callback', scormCallbackRouter);
router.use('/field-tasks', fieldRouter);
router.use('/announcements', announcementRouter);
router.use('/push', pushRouter);

export default router;