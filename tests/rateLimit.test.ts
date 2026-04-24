import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { createRateLimit, resolveClientIp } from '../src/middleware/rateLimitFactory';

describe('createRateLimit', () => {
  it('allows under limit, blocks over', async () => {
    const app = new Hono();
    const limiter = createRateLimit({ max: 2, windowMs: 1000, keyFn: () => 'k' });
    app.use('*', limiter.middleware);
    app.get('/', (c) => c.text('ok'));

    const r1 = await app.request('/');
    const r2 = await app.request('/');
    const r3 = await app.request('/');
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(429);
    limiter.dispose();
  });

  it("dispose unref's interval", () => {
    const limiter = createRateLimit({ max: 1, windowMs: 1000, keyFn: () => 'k' });
    expect(() => limiter.dispose()).not.toThrow();
  });

  it('with TRUST_PROXY=false, spoofed X-Forwarded-For does not change rate-limit bucket (uses socketIp)', async () => {
    const app = new Hono();
    app.use('*', async (c, next) => {
      c.set('socketIp', '10.0.0.1');
      await next();
    });
    const limiter = createRateLimit({
      max: 1,
      windowMs: 60_000,
      keyFn: (c) => resolveClientIp(c, false),
    });
    app.use('*', limiter.middleware);
    app.get('/', (c) => c.text('ok'));

    const r1 = await app.request('/', { headers: { 'x-forwarded-for': '1.1.1.1' } });
    const r2 = await app.request('/', { headers: { 'x-forwarded-for': '9.9.9.9' } });
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(429);
    limiter.dispose();
  });
});
