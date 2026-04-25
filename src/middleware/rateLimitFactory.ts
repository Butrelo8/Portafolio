import type { MiddlewareHandler } from 'hono';
import { AppError, toErrorResponse } from '../lib/errors';
import { MemoryStore, type RateLimitStore } from '../lib/rateLimitStore';
import { logger } from './requestLogger';

export interface RateLimitOptions {
  max: number;
  windowMs: number;
  keyFn: (c: Parameters<MiddlewareHandler>[0]) => string;
  message?: string;
  /** Shared store for multi-instance deploys. Defaults to in-process MemoryStore. */
  store?: RateLimitStore;
}

export interface RateLimiter {
  middleware: MiddlewareHandler;
  dispose: () => void;
}

export function createRateLimit(opts: RateLimitOptions): RateLimiter {
  const message = opts.message ?? 'Too many requests, please try again later.';
  const ownedStore = opts.store === undefined;
  const store: RateLimitStore = opts.store ?? new MemoryStore(opts.windowMs);

  const middleware: MiddlewareHandler = async (c, next) => {
    const key = opts.keyFn(c);
    let count: number;
    let resetAt: number;
    try {
      const result = await store.increment(key, opts.windowMs);
      count = result.count;
      resetAt = result.resetAt;
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      const storeType = store.constructor?.name ?? 'unknown';
      logger.warn({ msg: 'rate_limit_store_error', err: errMessage, storeType });
      await next();
      return;
    }
    if (count > opts.max) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json(toErrorResponse(new AppError('RATE_LIMITED', message, 429)), 429);
    }
    await next();
  };

  return {
    middleware,
    dispose: () => {
      if (ownedStore) store.close?.();
    },
  };
}

export { clientIp, resolveClientIp } from '../lib/clientIp';
