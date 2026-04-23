import { clientIp, createRateLimit, type RateLimiter } from './rateLimitFactory';

export function createHealthRateLimit(): RateLimiter {
  return createRateLimit({
    max: 30,
    windowMs: 60_000,
    keyFn: clientIp,
    message: 'Health endpoint rate limit exceeded.',
  });
}
