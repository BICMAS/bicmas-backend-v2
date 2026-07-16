import { prisma } from '../utils/db.js';

export class ModuleModel {
    static async findById(id) {
        return prisma.module.findUnique({
            where: { id },
            select: { id: true, courseId: true }
        });
    }

    static async delete(id) {
        console.log('[MODULE MODEL] Deleting ID:', id);  // FIXED: Log before delete
        return prisma.module.delete({
            where: { id }
        });
    }

    // ... other methods if needed
}