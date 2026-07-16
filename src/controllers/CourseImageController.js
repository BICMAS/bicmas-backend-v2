import { StorageService } from '../services/StorageService.js';
import { prisma } from '../utils/db.js';

export const addCourseImage = async (req, res) => {
    try {
        const { courseId } = req.params;
        const file = req.file;

        if (!courseId) {
            return res.status(400).json({
                success: false,
                error: 'courseId is required in URL params'
            });
        }

        if (!file) {
            return res.status(400).json({
                success: false,
                error: 'Image file is required (multipart/form-data, field name: "image")'
            });
        }

        const userId = req.user.id;

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { createdBy: true }
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        const isAuthorized =
            req.user.userRole === 'SUPER_ADMIN' ||
            req.user.userRole === 'HR_MANAGER' ||
            course.createdBy === userId;

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to update this course image'
            });
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({
                success: false,
                error: 'Only JPEG, PNG, GIF, or WebP images are allowed'
            });
        }

        const objectKey = StorageService.buildObjectKey(`courses/${courseId}`, file.originalname);
        await StorageService.uploadBuffer(objectKey, file.buffer, file.mimetype);

        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data: { imageUrl: objectKey },
            select: {
                id: true,
                title: true,
                imageUrl: true,
                updatedAt: true
            }
        });

        res.json({
            success: true,
            data: {
                ...updatedCourse,
                imageUrl: await StorageService.resolveStorageUrl(updatedCourse.imageUrl),
            },
            message: 'Course image updated successfully'
        });
    } catch (error) {
        console.error('[ADD COURSE IMAGE ERROR]', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload course image'
        });
    }
};
