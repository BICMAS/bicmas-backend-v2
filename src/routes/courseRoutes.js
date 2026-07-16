import { Router } from 'express';
import multer from 'multer';
import { getCourses, createDraft, updateCourse, publishCourse, getCourseById, deleteCourse, deleteModule } from '../controllers/CourseController.js';
import { getCourseModuleAccess } from '../controllers/ModulePacingController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { addCourseImage } from '../controllers/CourseImageController.js';

const courseRouter = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max for course images
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only images allowed'));
    }
});

courseRouter.get('/', authenticateToken, getCourses);
courseRouter.post('/draft', authenticateToken, requireRole(['HR_MANAGER', 'SUPER_ADMIN']), createDraft);
courseRouter.patch('/:id', authenticateToken, requireRole(['HR_MANAGER', 'SUPER_ADMIN']), updateCourse);
courseRouter.patch('/:id/publish', authenticateToken, requireRole(['HR_MANAGER', 'SUPER_ADMIN']), publishCourse);
courseRouter.get('/:id/module-access', authenticateToken, getCourseModuleAccess);
courseRouter.get('/:id', authenticateToken, getCourseById);
courseRouter.delete('/:id', authenticateToken, requireRole(['HR_MANAGER', 'SUPER_ADMIN']), deleteCourse);
courseRouter.delete('/:courseId/modules/:moduleId', authenticateToken, requireRole(['HR_MANAGER', 'SUPER_ADMIN']), deleteModule);
courseRouter.post('/:courseId/image', authenticateToken, upload.single('image'), addCourseImage);

export default courseRouter;