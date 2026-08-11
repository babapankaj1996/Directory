const buckets = new Map();
const MAX_BUCKETS = 10_000;
let requestsSinceCleanup = 0;

function clientKey(req, scope, keyBy) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : '';
  if (keyBy === 'email') return `${scope}:${email || ip}`;
  if (keyBy === 'ip-email') return `${scope}:${ip}:${email || '-'}`;
  return `${scope}:${ip}`;
}

function cleanup(now) {
  requestsSinceCleanup += 1;
  if (requestsSinceCleanup < 250 && buckets.size < MAX_BUCKETS) return;
  requestsSinceCleanup = 0;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (!oldestKey) break;
    buckets.delete(oldestKey);
  }
}

export function rateLimit({ windowMs = 60_000, max = 20, scope = 'default', keyBy = 'ip' } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    cleanup(now);
    const key = clientKey(req, scope, keyBy);
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    buckets.set(key, bucket);
    const remaining = Math.max(max - bucket.count, 0);
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(remaining));
    res.set('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
}
