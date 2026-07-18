import { prisma } from '../utils/db.js';

let vapidConfigured = false;

async function getWebPush() {
    const mod = await import('web-push');
    return mod.default;
}

async function ensureVapid() {
    if (vapidConfigured) return;
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) {
        throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set');
    }
    const webpush = await getWebPush();
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:support@example.com',
        pub,
        priv
    );
    vapidConfigured = true;
}

async function sendToSubscriptions(subs, payload) {
    await ensureVapid();
    const webpush = await getWebPush();
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const results = { sent: 0, failed: 0, removed: 0 };

    for (const sub of subs) {
        const subscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
        };
        try {
            await webpush.sendNotification(subscription, body, {
                TTL: 60 * 60 * 12
            });
            results.sent++;
        } catch (err) {
            const code = err.statusCode;
            if (code === 404 || code === 410) {
                await prisma.webPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
                results.removed++;
            } else {
                results.failed++;
            }
        }
    }
    return results;
}

export class PushService {
    /**
     * Send a Web Push payload to every stored subscription for the user.
     * Uses the same VAPID key pair from env on every send.
     */
    static async sendToUser(userId, payload) {
        if (!PushService.isConfigured()) {
            return { sent: 0, failed: 0, removed: 0, skipped: true };
        }
        const subs = await prisma.webPushSubscription.findMany({ where: { userId } });
        return sendToSubscriptions(subs, payload);
    }

    /**
     * Send to every Web Push subscription for users in an organization.
     */
    static async sendToOrganization(orgId, payload) {
        if (!PushService.isConfigured()) {
            return { sent: 0, failed: 0, removed: 0, skipped: true };
        }
        if (!orgId) {
            return { sent: 0, failed: 0, removed: 0, skipped: true };
        }
        const subs = await prisma.webPushSubscription.findMany({
            where: { user: { orgId } }
        });
        return sendToSubscriptions(subs, payload);
    }

    static isConfigured() {
        return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
    }

    static getPublicKey() {
        return process.env.VAPID_PUBLIC_KEY || null;
    }
}
