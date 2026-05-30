import type { MiddlewareHandler } from 'hono';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * In-memory sliding window rate limiter.
 * @param limit - Max requests per window
 * @param windowMs - Window size in ms
 * @returns Hono middleware
 */
export function rateLimitMiddleware(limit = 100, windowMs = 60_000): MiddlewareHandler {
  return async (c, next) => {
    const key = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'anonymous';
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(Math.max(0, limit - bucket.count)));

    if (bucket.count > limit) {
      return c.json(
        {
          success: false,
          data: null,
          error: { code: 'RATE_LIMIT', message: 'Too many requests' },
          meta: null,
        },
        429,
      );
    }

    await next();
  };
}
