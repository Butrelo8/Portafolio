import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { resolveClientIp } from '../src/lib/clientIp';
import type { RateLimitStore } from '../src/lib/rateLimitStore';
import { createRateLimit } from '../src/middleware/rateLimitFactory';

class FailingStore implements RateLimitStore {
  async increment(): Promise<{ count: number; resetAt: number }> {
    throw new Error('store_unreachable');
  }
}

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

  it('fail-open when store.increment throws: 200 + warn log with err and storeType', async () => {
    const lines: string[] = [];
    const origErr = console.error;
    console.error = (msg: unknown) => {
      lines.push(String(msg));
    };
    try {
      const app = new Hono();
      const limiter = createRateLimit({
        max: 1,
        windowMs: 60_000,
        keyFn: () => 'k',
        store: new FailingStore(),
      });
      app.use('*', limiter.middleware);
      app.get('/', (c) => c.text('ok'));

      const r1 = await app.request('/');
      const r2 = await app.request('/');
      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);

      const warnLines = lines
        .map((l) => {
          try {
            return JSON.parse(l) as { msg?: string; err?: string; storeType?: string };
          } catch {
            return null;
          }
        })
        .filter((x): x is NonNullable<typeof x> => x?.msg === 'rate_limit_store_error');
      expect(warnLines.length).toBeGreaterThanOrEqual(2);
      expect(warnLines[0]?.err).toBe('store_unreachable');
      expect(warnLines[0]?.storeType).toBe('FailingStore');

      limiter.dispose();
    } finally {
      console.error = origErr;
    }
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
