"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unsubscribePush = exports.subscribePush = exports.getVapidPublicKey = void 0;
var _db = require("../utils/db.js");
var _PushService = require("../service/PushService.js");
/** Public key for PushManager.subscribe — must match server VAPID private key */
const getVapidPublicKey = (req, res) => {
  const key = _PushService.PushService.getPublicKey();
  if (!key) {
    return res.status(503).json({
      error: 'Web Push not configured (missing VAPID_PUBLIC_KEY)'
    });
  }
  return res.json({
    publicKey: key
  });
};

/**
 * Store subscription from browser PushManager.subscribe().
 * Body: { endpoint, keys: { p256dh, auth } }
 */
exports.getVapidPublicKey = getVapidPublicKey;
const subscribePush = async (req, res) => {
  try {
    const {
      endpoint,
      keys
    } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        error: 'Expected { endpoint, keys: { p256dh, auth } } from PushManager.subscribe()'
      });
    }
    await _db.prisma.webPushSubscription.upsert({
      where: {
        endpoint
      },
      create: {
        userId: req.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers['user-agent'] || null
      },
      update: {
        userId: req.user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers['user-agent'] || null
      }
    });
    return res.status(201).json({
      success: true
    });
  } catch (error) {
    console.error('[PUSH SUBSCRIBE]', error);
    return res.status(400).json({
      error: error.message
    });
  }
};

/** Remove subscription (e.g. on logout or unsubscribe) */
exports.subscribePush = subscribePush;
const unsubscribePush = async (req, res) => {
  try {
    const {
      endpoint
    } = req.body || {};
    if (!endpoint) {
      return res.status(400).json({
        error: 'endpoint required'
      });
    }
    const existing = await _db.prisma.webPushSubscription.findUnique({
      where: {
        endpoint
      }
    });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: 'Subscription not found'
      });
    }
    await _db.prisma.webPushSubscription.delete({
      where: {
        endpoint
      }
    });
    return res.json({
      success: true
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
};
exports.unsubscribePush = unsubscribePush;