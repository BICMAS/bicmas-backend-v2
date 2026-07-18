import { prisma } from '../utils/db.js';
import { PushService } from '../service/PushService.js';
import { OneSignalService } from '../service/OneSignalService.js';

const ANNOUNCEMENT_SELECT = {
    id: true,
    text: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true,
    user: {
        select: { fullName: true, userRole: true, orgId: true }
    }
};

function parsePagination(query) {
    const limitRaw = parseInt(String(query.limit ?? '10'), 10);
    const pageRaw = parseInt(String(query.page ?? ''), 10);
    const offsetRaw = parseInt(String(query.offset ?? ''), 10);

    const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(limitRaw, 1), 100)
        : 10;

    let page = 1;
    let offset = 0;

    if (Number.isFinite(pageRaw) && pageRaw >= 1) {
        page = pageRaw;
        offset = (page - 1) * limit;
    } else if (Number.isFinite(offsetRaw) && offsetRaw >= 0) {
        offset = offsetRaw;
        page = Math.floor(offset / limit) + 1;
    }

    return { limit, offset, page };
}

function resolveOrgId(req) {
    const userOrgId = req.user.orgId;
    const requestedOrgId =
        typeof req.query.orgId === 'string' ? req.query.orgId.trim() : null;
    return req.user.userRole === 'SUPER_ADMIN' && requestedOrgId
        ? requestedOrgId
        : userOrgId;
}

async function findAnnouncementInOrg(announcementId, orgId) {
    if (!orgId) return null;

    return prisma.announcement.findFirst({
        where: {
            id: announcementId,
            user: { orgId }
        },
        select: ANNOUNCEMENT_SELECT
    });
}

function canManageAnnouncements(userRole) {
    return ['SUPER_ADMIN', 'HR_MANAGER'].includes(userRole);
}

// Post a new announcement (admin/HR only)
export const createAnnouncement = async (req, res) => {
    try {
        const { text } = req.body;

        if (!text?.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Announcement text is required'
            });
        }

        const userId = req.user.id;
        const userOrgId = req.user.orgId;

        if (!canManageAnnouncements(req.user.userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Only admins or HR can post announcements'
            });
        }

        if (!userOrgId) {
            return res.status(400).json({
                success: false,
                error: 'User must belong to an organization to post announcements'
            });
        }

        const trimmed = text.trim();
        const announcement = await prisma.announcement.create({
            data: {
                text: trimmed,
                createdBy: userId
            },
            select: ANNOUNCEMENT_SELECT
        });

        const preview =
            trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
        const pushPayload = {
            title: 'BICMAS LEARN Announcement',
            body: preview,
            url: '/',
            announcementId: announcement.id
        };

        if (PushService.isConfigured()) {
            void PushService.sendToOrganization(userOrgId, pushPayload)
                .then((results) => {
                    console.log('[ANNOUNCEMENT WEB PUSH]', results);
                })
                .catch((err) => {
                    console.error('[ANNOUNCEMENT WEB PUSH ERROR]', err);
                });
        }

        if (OneSignalService.isConfigured()) {
            void OneSignalService.sendToOrganization(userOrgId, pushPayload)
                .then((results) => {
                    console.log('[ANNOUNCEMENT ONESIGNAL]', results);
                })
                .catch((err) => {
                    console.error('[ANNOUNCEMENT ONESIGNAL ERROR]', err);
                });
        } else {
            console.warn(
                '[ANNOUNCEMENT ONESIGNAL] skipped — ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY not set on this deployment'
            );
        }

        res.status(201).json({
            success: true,
            data: announcement,
            message: 'Announcement posted successfully'
        });
    } catch (error) {
        console.error('[CREATE ANNOUNCEMENT ERROR]', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create announcement'
        });
    }
};

// Get announcements (paginated) – org-scoped
export const getAnnouncements = async (req, res) => {
    try {
        const { limit, offset, page } = parsePagination(req.query);
        const effectiveOrgId = resolveOrgId(req);

        if (!effectiveOrgId) {
            return res.status(400).json({
                success: false,
                error: 'User must belong to an organization to view announcements'
            });
        }

        const where = {
            user: { orgId: effectiveOrgId }
        };

        const [announcements, total] = await Promise.all([
            prisma.announcement.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: ANNOUNCEMENT_SELECT
            }),
            prisma.announcement.count({ where })
        ]);

        const pageCount = Math.max(1, Math.ceil(total / limit)) || 1;

        res.json({
            success: true,
            data: announcements,
            meta: {
                orgId: effectiveOrgId,
                total,
                limit,
                offset,
                page,
                pageCount: total === 0 ? 0 : pageCount,
                hasMore: offset + announcements.length < total
            }
        });
    } catch (error) {
        console.error('[GET ANNOUNCEMENTS ERROR]', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch announcements'
        });
    }
};

// Get a single announcement
export const getAnnouncementById = async (req, res) => {
    try {
        const { id } = req.params;
        const effectiveOrgId = resolveOrgId(req);

        if (!effectiveOrgId) {
            return res.status(400).json({
                success: false,
                error: 'User must belong to an organization to view announcements'
            });
        }

        const announcement = await findAnnouncementInOrg(id, effectiveOrgId);
        if (!announcement) {
            return res.status(404).json({
                success: false,
                error: 'Announcement not found'
            });
        }

        res.json({
            success: true,
            data: announcement
        });
    } catch (error) {
        console.error('[GET ANNOUNCEMENT ERROR]', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch announcement'
        });
    }
};

// Update announcement (admin/HR only, same org)
export const updateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;

        if (!canManageAnnouncements(req.user.userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Only admins or HR can update announcements'
            });
        }

        if (!text?.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Announcement text is required'
            });
        }

        const userOrgId = req.user.orgId;
        if (!userOrgId && req.user.userRole !== 'SUPER_ADMIN') {
            return res.status(400).json({
                success: false,
                error: 'User must belong to an organization to update announcements'
            });
        }

        const effectiveOrgId = resolveOrgId(req);
        if (!effectiveOrgId) {
            return res.status(400).json({
                success: false,
                error: 'Organization context is required'
            });
        }

        const existing = await findAnnouncementInOrg(id, effectiveOrgId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Announcement not found'
            });
        }

        const announcement = await prisma.announcement.update({
            where: { id },
            data: { text: text.trim() },
            select: ANNOUNCEMENT_SELECT
        });

        res.json({
            success: true,
            data: announcement,
            message: 'Announcement updated successfully'
        });
    } catch (error) {
        console.error('[UPDATE ANNOUNCEMENT ERROR]', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update announcement'
        });
    }
};

// Delete announcement (admin/HR only, same org)
export const deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;

        if (!canManageAnnouncements(req.user.userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Only admins or HR can delete announcements'
            });
        }

        const effectiveOrgId = resolveOrgId(req);
        if (!effectiveOrgId) {
            return res.status(400).json({
                success: false,
                error: 'Organization context is required'
            });
        }

        const existing = await findAnnouncementInOrg(id, effectiveOrgId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Announcement not found'
            });
        }

        await prisma.announcement.delete({ where: { id } });

        res.json({
            success: true,
            message: 'Announcement deleted successfully'
        });
    } catch (error) {
        console.error('[DELETE ANNOUNCEMENT ERROR]', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete announcement'
        });
    }
};
