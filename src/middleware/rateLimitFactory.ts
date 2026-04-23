import type { MiddlewareHandler } from 'hono';
import { AppError, toErrorResponse } from '../lib/errors';

export interface RateLimitOptions {
  max: number;
  windowMs: number;
  keyFn: (c: Parameters<MiddlewareHandler>[0]) => string;
  message?: string;
}

export interface RateLimiter {
  middleware: MiddlewareHandler;
  dispose: () => void;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export function createRateLimit(opts: RateLimitOptions): RateLimiter {
  const buckets = new Map<string, Bucket>();
  const message = opts.message ?? 'Too many requests, please try again later.';

  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, opts.windowMs);
  if (typeof (interval as { unref?: () => void }).unref === 'function') {
    (interval as { unref: () => void }).unref();
  }

  const middleware: MiddlewareHandler = async (c, next) => {
    const key = opts.keyFn(c);
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    } else {
      bucket.count += 1;
      if (bucket.count > opts.max) {
        const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
        c.header('Retry-After', String(retryAfter));
        return c.json(toErrorResponse(new AppError('RATE_LIMITED', message, 429)), 429);
      }
    }
    await next();
  };

  return { middleware, dispose: () => clearInterval(interval) };
}

export function clientIp(c: Parameters<MiddlewareHandler>[0]): string {
  const fwd = c.req.header('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() ?? 'unknown';
  return c.req.header('x-real-ip') ?? 'unknown';
}
