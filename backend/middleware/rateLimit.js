// ============================================================
// middleware/rateLimit.js — Lightweight in-memory rate limiter
// ============================================================
// No external dependency. Suitable for single-instance MVP deploys.
// Resets buckets periodically to avoid unbounded memory growth.
// ============================================================

const buckets = new Map();
let lastGc = Date.now();
const GC_INTERVAL_MS = 5 * 60 * 1000;

function gcBuckets(windowMs) {
  const now = Date.now();
  if (now - lastGc < GC_INTERVAL_MS) return;
  lastGc = now;
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.start > windowMs) buckets.delete(key);
  }
}

/**
 * @param {object} opts
 * @param {number} opts.windowMs  Rolling window (default 60s)
 * @param {number} opts.max       Max requests per window per key
 * @param {(req: import('express').Request) => string} [opts.keyFn]
 */
function rateLimit({ windowMs = 60_000, max = 120, keyFn } = {}) {
  const resolveKey =
    keyFn ||
    ((req) => req.ip || req.socket?.remoteAddress || "unknown");

  return (req, res, next) => {
    gcBuckets(windowMs);
    const key = resolveKey(req);
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));

    if (bucket.count > max) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please wait a moment and try again."
      });
    }
    next();
  };
}

/** Stricter limit for expensive POST actions (AI, image gen, integrations). */
const expensiveActionLimit = rateLimit({ windowMs: 60_000, max: 20 });

module.exports = { rateLimit, expensiveActionLimit };
