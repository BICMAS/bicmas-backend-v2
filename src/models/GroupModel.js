import { prisma } from '../utils/db.js';

export class GroupModel {
    static async findMany() {
        return prisma.group.findMany({ include: { members: true } });
    }

    static async create(data) {
        return prisma.group.create({ data });
    }

    static async addMember(groupId, userId, role = 'MEMBER') {
        return prisma.groupMember.create({ data: { groupId, userId, role } });
    }
}