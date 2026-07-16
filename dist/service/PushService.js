"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PushService = void 0;
var _db = require("../utils/db.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
let vapidConfigured = false;
async function getWebPush() {
  const mod = await Promise.resolve().then(() => _interopRequireWildcard(require('web-push')));
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
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@example.com', pub, priv);
  vapidConfigured = true;
}
class PushService {
  /**
   * Send a Web Push payload to every stored subscription for the user.
   * Uses the same VAPID key pair from env on every send.
   */
  static async sendToUser(userId, payload) {
    await ensureVapid();
    const webpush = await getWebPush();
    const subs = await _db.prisma.webPushSubscription.findMany({
      where: {
        userId
      }
    });
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const results = {
      sent: 0,
      failed: 0,
      removed: 0
    };
    for (const sub of subs) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };
      try {
        await webpush.sendNotification(subscription, body, {
          TTL: 60 * 60 * 12
        });
        results.sent++;
      } catch (err) {
        const code = err.statusCode;
        if (code === 404 || code === 410) {
          await _db.prisma.webPushSubscription.delete({
            where: {
              id: sub.id
            }
          }).catch(() => {});
          results.removed++;
        } else {
          results.failed++;
        }
      }
    }
    return results;
  }
  static isConfigured() {
    return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  }
  static getPublicKey() {
    return process.env.VAPID_PUBLIC_KEY || null;
  }
}
exports.PushService = PushService;