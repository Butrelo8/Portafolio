import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { createRateLimit } from '../src/middleware/rateLimitFactory';

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
});
