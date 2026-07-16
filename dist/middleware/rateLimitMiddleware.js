"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.authRateLimiter = void 0;
exports.createRateLimiter = createRateLimiter;
const buckets = new Map();
function pruneBucket(bucket, windowMs, now) {
  while (bucket.length > 0 && bucket[0] <= now - windowMs) {
    bucket.shift();
  }
}
function createRateLimiter({
  windowMs = 60_000,
  max = 100,
  message = 'Too many requests'
} = {}) {
  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    const bucket = buckets.get(key);
    pruneBucket(bucket, windowMs, now);
    if (bucket.length >= max) {
      return res.status(429).json({
        error: message
      });
    }
    bucket.push(now);
    next();
  };
}
const authRateLimiter = exports.authRateLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 20,
  message: 'Too many authentication attempts. Try again later.'
});