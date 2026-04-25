import type { MiddlewareHandler } from 'hono';
import { env } from '../env';

/** Client IP for rate limiting / access logs; `trustProxy` mirrors `env.TRUST_PROXY` (explicit param for tests). */
export function resolveClientIp(c: Parameters<MiddlewareHandler>[0], trustProxy: boolean): string {
  if (trustProxy) {
    const fwd = c.req.header('x-forwarded-for');
    if (fwd) return fwd.split(',')[0]?.trim() ?? 'unknown';
    return c.req.header('x-real-ip') ?? 'unknown';
  }
  return (c.get('socketIp') as string | undefined) ?? 'unknown';
}

export function clientIp(c: Parameters<MiddlewareHandler>[0]): string {
  return resolveClientIp(c, env.TRUST_PROXY);
}
