import { prisma } from '../utils/db.js';

const ONESIGNAL_API = 'https://api.onesignal.com/notifications';
const CHUNK_SIZE = 200;

/**
 * Mobile push via OneSignal REST API.
 * Requires ONESIGNAL_APP_ID + ONESIGNAL_REST_API_KEY.
 * Devices must call OneSignal.login(backendUserId) so External ID matches User.id.
 */
export class OneSignalService {
    static isConfigured() {
        return !!(
            process.env.ONESIGNAL_APP_ID?.trim() &&
            process.env.ONESIGNAL_REST_API_KEY?.trim()
        );
    }

    /**
     * @param {string[]} externalIds - Backend user ids
     * @param {{ title: string, body: string, url?: string, data?: Record<string, unknown> }} payload
     */
    static async sendToExternalIds(externalIds, payload) {
        if (!OneSignalService.isConfigured()) {
            return { sent: 0, failed: 0, skipped: true };
        }

        const ids = [...new Set(externalIds.filter(Boolean))];
        if (ids.length === 0) {
            return { sent: 0, failed: 0, chunks: 0 };
        }

        const appId = process.env.ONESIGNAL_APP_ID.trim();
        const apiKey = process.env.ONESIGNAL_REST_API_KEY.trim();
        const title = payload.title || 'BICMAS LEARN';
        const body = payload.body || '';
        let sent = 0;
        let failed = 0;
        let chunks = 0;

        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
            const chunk = ids.slice(i, i + CHUNK_SIZE);
            chunks++;
            try {
                const res = await fetch(ONESIGNAL_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                        Authorization: `Key ${apiKey}`
                    },
                    body: JSON.stringify({
                        app_id: appId,
                        target_channel: 'push',
                        include_aliases: {
                            external_id: chunk
                        },
                        headings: { en: title },
                        contents: { en: body },
                        data: {
                            url: payload.url || '/',
                            ...(payload.data || {})
                        },
                        // Open app / deep link when supported
                        app_url: payload.url
                            ? payload.url.startsWith('http')
                                ? payload.url
                                : undefined
                            : undefined
                    })
                });

                const bodyText = await res.text().catch(() => '');
                let parsed = null;
                try {
                    parsed = bodyText ? JSON.parse(bodyText) : null;
                } catch {
                    parsed = null;
                }

                if (!res.ok) {
                    console.error('[ONESIGNAL]', res.status, bodyText);
                    failed += chunk.length;
                    continue;
                }

                const recipients =
                    typeof parsed?.recipients === 'number' ? parsed.recipients : null;
                if (recipients === 0) {
                    console.warn(
                        '[ONESIGNAL] API accepted request but recipients=0. ' +
                            'No subscriptions matched these External IDs. ' +
                            'Confirm the Android app called OneSignal.login(backendUserId) ' +
                            'and that user appears with that External ID in OneSignal Audience.',
                        { notificationId: parsed?.id, externalIdCount: chunk.length }
                    );
                } else {
                    console.log('[ONESIGNAL] delivered', {
                        notificationId: parsed?.id,
                        recipients,
                        externalIdCount: chunk.length
                    });
                }
                // Count API-accepted chunks; recipients may still be 0 if External IDs missing.
                sent += chunk.length;
            } catch (err) {
                console.error('[ONESIGNAL] request failed', err);
                failed += chunk.length;
            }
        }

        return { sent, failed, chunks };
    }

    /**
     * Push to every user in an organization (matched by OneSignal External ID = User.id).
     */
    static async sendToOrganization(orgId, payload) {
        if (!OneSignalService.isConfigured()) {
            console.warn(
                '[ONESIGNAL] skipped — set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY on this server'
            );
            return { sent: 0, failed: 0, skipped: true };
        }
        if (!orgId) {
            console.warn('[ONESIGNAL] skipped — missing orgId');
            return { sent: 0, failed: 0, skipped: true };
        }

        const users = await prisma.user.findMany({
            where: { orgId },
            select: { id: true }
        });

        console.log('[ONESIGNAL] targeting org users', {
            orgId,
            userCount: users.length
        });

        return OneSignalService.sendToExternalIds(
            users.map((u) => u.id),
            payload
        );
    }
}
