import { GroupModel } from '../models/GroupModel.js';
import { prisma } from '../utils/db.js';

export class GroupService {
    static async getGroups() {
        return await GroupModel.findMany();
    }

    static async createGroup(data) {
        if (!data.name) throw new Error('Group name required');
        return await GroupModel.create(data);
    }

    static async addGroupMember(groupId, userId, role = 'MEMBER') {
        const group = await GroupModel.findMany({ where: { id: groupId } });
        if (group.length === 0) throw new Error('Group not found');
        const existing = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
        if (existing) throw new Error('User already a member');
        return await GroupModel.addMember(groupId, userId, role);
    }
}