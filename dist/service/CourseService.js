"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CourseService = void 0;
var _CourseModel = require("../models/CourseModel.js");
var _ModuleModel = require("../models/ModuleModel.js");
var _StorageService = require("../services/StorageService.js");
async function withResolvedImageUrl(course) {
  if (!course?.imageUrl) return course;
  return {
    ...course,
    imageUrl: await _StorageService.StorageService.resolveStorageUrl(course.imageUrl)
  };
}
class CourseService {
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
    return await _CourseModel.CourseModel.create(courseData);
  }
  static async updateCourse(id, data, requester) {
    const course = await _CourseModel.CourseModel.findById(id);
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
    if (data.modules !== undefined) {
      updateData.modules = data.modules;
    }
    console.log('[COURSE SERVICE] Updating with status:', updateData.status);
    return await _CourseModel.CourseModel.updateNested(id, updateData);
  }
  static async publishCourse(id, data, requester) {
    const course = await _CourseModel.CourseModel.findById(id);
    if (!course) throw new Error('Course not found');
    if (course.createdBy !== requester.id && requester.userRole !== 'SUPER_ADMIN') {
      throw new Error('Only creator or super admin can publish');
    }
    if (!data.modules || data.modules.length === 0) throw new Error('Course must have at least one module');
    return await _CourseModel.CourseModel.publish(id);
  }
  static async getCourses() {
    const courses = await _CourseModel.CourseModel.findMany();
    return Promise.all(courses.map(withResolvedImageUrl));
  }
  static async getCourseById(id) {
    const course = await _CourseModel.CourseModel.findById(id);
    if (!course) throw new Error('Course not found');
    return withResolvedImageUrl(course);
  }
  static async deleteCourse(id, requester) {
    const course = await _CourseModel.CourseModel.findById(id);
    if (!course) throw new Error('Course not found');
    if (course.createdBy !== requester.id && requester.userRole !== 'SUPER_ADMIN') {
      throw new Error('Only creator or super admin can delete');
    }
    console.log('[COURSE SERVICE] Deleting course ID:', id);
    await _CourseModel.CourseModel.delete(id);
    return {
      message: 'Course deleted successfully'
    };
  }
  static async deleteModule(courseId, moduleId, requester) {
    const course = await _CourseModel.CourseModel.findById(courseId);
    if (!course) throw new Error('Course not found');
    if (course.createdBy !== requester.id && requester.userRole !== 'SUPER_ADMIN') {
      throw new Error('Only creator or super admin can delete');
    }
    const module = await _ModuleModel.ModuleModel.findById(moduleId);
    if (!module) throw new Error('Module not found');
    if (module.courseId !== courseId) throw new Error('Module not in course');
    console.log('[COURSE SERVICE] Deleting module ID:', moduleId, 'from course:', courseId);
    await _ModuleModel.ModuleModel.delete(moduleId);
    return {
      message: 'Module deleted successfully'
    };
  }
}
exports.CourseService = CourseService;