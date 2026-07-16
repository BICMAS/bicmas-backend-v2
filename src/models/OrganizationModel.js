import { prisma } from '../utils/db.js';

export class OrganizationModel {
    // Create a new organization (super admin only)
    static async create(data) {
        return prisma.organization.create({
            data: {
                name: data.name,
                metadata: data.metadata,
                status: data.status || 'ACTIVE',
                createdBy: data.createdBy,  // From req.user.id
            }
        });
    }

    // Fetch all organizations (scoped to super admin's created ones)
    static async findMany(creatorId = null) {
        const where = creatorId ? { createdBy: creatorId } : {};
        return prisma.organization.findMany({
            where,
            include: {
                creator: {  // Include creator user details
                    select: { id: true, fullName: true, userRole: true }
                },
                users: {  // Include users in org
                    select: { id: true, fullName: true, userRole: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    // Fetch a single organization by ID
    static async findById(id) {
        return prisma.organization.findUnique({
            where: { id },
            include: {
                creator: true,
                users: true
            }
        });
    }

    // Update organization (e.g., name, status)
    static async update(id, data) {
        return prisma.organization.update({
            where: { id },
            data,
            include: { users: true }
        });
    }

    // Delete organization (cascade to users/groups if needed)
    static async delete(id) {
        return prisma.organization.delete({ where: { id } });
    }

    // Get orgs for a user (if HR/super in org)
    static async findByUserId(userId) {
        return prisma.organization.findMany({
            where: {
                OR: [
                    { createdBy: userId },  // Super admin's orgs
                    { users: { some: { id: userId } } }  // User's orgs
                ]
            }
        });
    }

    static async findById(id) {
        return prisma.learningPath.findUnique({
            where: { id },
            include: {
                creator: true,
                enrolments: {
                    include: { user: { select: { id: true, fullName: true, email: true } } }
                }
            }
        });
    }
}