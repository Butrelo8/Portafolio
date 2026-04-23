import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { MemoryStore, type RateLimitStore } from '../src/lib/rateLimitStore';
import { createRateLimit } from '../src/middleware/rateLimitFactory';

function contractSuite(name: string, factory: () => RateLimitStore) {
  describe(name, () => {
    let store: RateLimitStore;
    beforeEach(() => {
      store = factory();
    });
    afterEach(() => {
      store.close?.();
    });

    it('first increment returns count 1', async () => {
      const { count } = await store.increment('key-a', 60_000);
      expect(count).toBe(1);
    });

    it('successive increments within window accumulate', async () => {
      await store.increment('key-b', 60_000);
      await store.increment('key-b', 60_000);
      const { count } = await store.increment('key-b', 60_000);
      expect(count).toBe(3);
    });

    it('resetAt is in the future', async () => {
      const { resetAt } = await store.increment('key-c', 60_000);
      expect(resetAt).toBeGreaterThan(Date.now());
    });

    it('resetAt is approximately now + windowMs', async () => {
      const before = Date.now();
      const { resetAt } = await store.increment('key-d', 60_000);
      expect(resetAt).toBeGreaterThanOrEqual(before + 59_000);
      expect(resetAt).toBeLessThanOrEqual(before + 61_000);
    });

    it('different keys are isolated', async () => {
      await store.increment('key-e', 60_000);
      const { count } = await store.increment('key-f', 60_000);
      expect(count).toBe(1);
    });
  });
}

contractSuite('MemoryStore', () => new MemoryStore());

describe('createRateLimit with injected store', () => {
  it('accepts a custom store and enforces max', async () => {
    const store = new MemoryStore(1000);
    const limiter = createRateLimit({
      max: 2,
      windowMs: 60_000,
      keyFn: () => 'ip',
      store,
    });

    const app = new Hono();
    app.use('*', limiter.middleware);
    app.get('/', (c) => c.text('ok'));

    const r1 = await app.request('/');
    const r2 = await app.request('/');
    const r3 = await app.request('/');
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(429);

    limiter.dispose();
    store.close();
  });
});
