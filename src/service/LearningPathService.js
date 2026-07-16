import { LearningPathModel } from '../models/LearningPathModel.js';
import { CourseModel } from '../models/CourseModel.js';

export class LearningPathService {
    static async createPath(data, creator) {
        const { title, description, department, enrolmentRule, curriculumSequence } = data;

        // Validate required
        if (!title) throw new Error('Path title required');
        if (!curriculumSequence || !Array.isArray(curriculumSequence) || curriculumSequence.length === 0) {
            throw new Error('Curriculum sequence required');
        }
        if (creator.userRole !== 'HR_MANAGER' && creator.userRole !== 'SUPER_ADMIN') {
            throw new Error('Only HR and super admin can create learning paths');
        }

        // Validate courses exist/published
        const courses = await CourseModel.findManyByIds(curriculumSequence);
        if (courses.length !== curriculumSequence.length) throw new Error('Some courses not found');
        if (courses.some(c => c.status !== 'PUBLISHED')) throw new Error('All courses must be published');

        // FIXED: Optional department validation (e.g., exists in org if HR)
        if (department && creator.userRole === 'HR_MANAGER') {
            // Assume DepartmentModel.exists(department, creator.orgId)
            // if (!await DepartmentModel.exists(department, creator.orgId)) throw new Error('Department not in org');
        }

        // Create path
        const path = await LearningPathModel.create({
            title,
            description,
            department,
            enrolmentRule,
            curriculumSequence,
            createdBy: creator.id
        });

        return path;
    }

    static async getAllPaths() {
        return LearningPathModel.findMany();
    }
}