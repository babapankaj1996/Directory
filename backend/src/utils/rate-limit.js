const buckets = new Map();

function clientKey(req, scope) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : '';
  return `${scope}:${email || ip}`;
}

export function rateLimit({ windowMs = 60_000, max = 20, scope = 'default' } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = clientKey(req, scope);
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    buckets.set(key, bucket);
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
}
