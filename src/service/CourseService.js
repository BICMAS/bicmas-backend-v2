import { CourseModel } from '../models/CourseModel.js';
import { ModuleModel } from '../models/ModuleModel.js';
import { StorageService } from '../services/StorageService.js';
import { linkModulesToManifestActivities } from '../lib/modulePacing.js';

async function withResolvedImageUrl(course) {
    if (!course?.imageUrl) return course;
    return {
        ...course,
        imageUrl: await StorageService.resolveStorageUrl(course.imageUrl),
    };
}

export class CourseService {
    static async createDraft(data, creatorId) {
        if (!data.title) throw new Error('Course title required');
        const courseData = {
            ...data,
            status: 'DRAFT',
            tags: data.tags || null,
            visibility: data.visibility || null,
            version: data.version || null,
            createdBy: creatorId
        };
        return await CourseModel.create(courseData);
    }

    static async updateCourse(id, data, requester) {
        const course = await CourseModel.findById(id);
        if (!course) throw new Error('Course not found');

        if (course.createdBy !== requester.id && requester.userRole !== 'SUPER_ADMIN') {
            throw new Error('Only creator or super admin can update');
        }

        if (data.modules !== undefined) {
            if (!Array.isArray(data.modules)) {
                throw new Error('Modules must be an array');
            }


            data.modules.forEach((module, index) => {
                if (!module.name) {
                    throw new Error(`Module ${index + 1} name is required`);
                }


                if (module.lessons && Array.isArray(module.lessons)) {
                    module.lessons.forEach((lesson, lessonIndex) => {
                        if (!lesson.title) {
                            throw new Error(`Lesson ${lessonIndex + 1} in module "${module.name}" title is required`);
                        }
                    });
                }
            });
        }


        const updateData = {
            title: data.title,
            description: data.description || null,
            tags: data.tags || null,
            visibility: data.visibility || null,
            version: data.version || null,
            scormPackageId: data.scormPackageId || null,
            status: data.status || 'PUBLISHED'
        };

        if (data.passingScore !== undefined) {
            const parsed = Number(data.passingScore);
            if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
                throw new Error('Passing score must be between 0 and 100');
            }
            updateData.passingScore = parsed;
        }

        if (data.requireQuizPass !== undefined) {
            updateData.requireQuizPass = Boolean(data.requireQuizPass);
        }

        if (data.modulePacingEnabled !== undefined) {
            updateData.modulePacingEnabled = Boolean(data.modulePacingEnabled);
        }

        if (data.modulePacingDays !== undefined) {
            const parsedDays = Number(data.modulePacingDays);
            if (!Number.isFinite(parsedDays) || parsedDays < 1 || parsedDays > 365) {
                throw new Error('Module pacing days must be between 1 and 365');
            }
            updateData.modulePacingDays = Math.round(parsedDays);
        }

        if (data.pacingStartDate !== undefined) {
            if (data.pacingStartDate === null || data.pacingStartDate === '') {
                updateData.pacingStartDate = null;
            } else {
                const parsedDate = new Date(data.pacingStartDate);
                if (Number.isNaN(parsedDate.getTime())) {
                    throw new Error('Invalid pacing start date');
                }
                updateData.pacingStartDate = parsedDate;
            }
        }

        if (data.modulePacingEnabled === true) {
            const effectiveStartDate =
                updateData.pacingStartDate !== undefined
                    ? updateData.pacingStartDate
                    : course.pacingStartDate;
            if (!effectiveStartDate) {
                throw new Error('Pacing start date is required when module pacing is enabled');
            }
        }


        if (data.modules !== undefined) {
            updateData.modules = data.modules;
        }

        console.log('[COURSE SERVICE] Updating with status:', updateData.status);

        const updated = await CourseModel.updateNested(id, updateData);

        await linkModulesToManifestActivities(updated.id);
        return CourseModel.findById(updated.id);
    }

    static async publishCourse(id, data, requester) {
        const course = await CourseModel.findById(id);
        if (!course) throw new Error('Course not found');
        if (course.createdBy !== requester.id && requester.userRole !== 'SUPER_ADMIN') {
            throw new Error('Only creator or super admin can publish');
        }
        if (!data.modules || data.modules.length === 0) throw new Error('Course must have at least one module');

        return await CourseModel.publish(id);
    }

    static async getCourses() {
        const courses = await CourseModel.findMany();
        return Promise.all(courses.map(withResolvedImageUrl));
    }

    static async getCourseById(id) {
        const course = await CourseModel.findById(id);
        if (!course) throw new Error('Course not found');
        return withResolvedImageUrl(course);
    }

    static async deleteCourse(id, requester) {

        const course = await CourseModel.findById(id);
        if (!course) throw new Error('Course not found');
        if (course.createdBy !== requester.id && requester.userRole !== 'SUPER_ADMIN') {
            throw new Error('Only creator or super admin can delete');
        }

        console.log('[COURSE SERVICE] Deleting course ID:', id);
        await CourseModel.delete(id);
        return { message: 'Course deleted successfully' };
    }

    static async deleteModule(courseId, moduleId, requester) {

        const course = await CourseModel.findById(courseId);
        if (!course) throw new Error('Course not found');
        if (course.createdBy !== requester.id && requester.userRole !== 'SUPER_ADMIN') {
            throw new Error('Only creator or super admin can delete');
        }


        const module = await ModuleModel.findById(moduleId);
        if (!module) throw new Error('Module not found');
        if (module.courseId !== courseId) throw new Error('Module not in course');

        console.log('[COURSE SERVICE] Deleting module ID:', moduleId, 'from course:', courseId);
        await ModuleModel.delete(moduleId);
        return { message: 'Module deleted successfully' };
    }
}