# Pluggable Rate Limit Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a `RateLimitStore` interface from the in-memory rate limiter so adapters (Redis, Upstash, Cloudflare KV) can be swapped in without changing middleware logic.

**Architecture:** Pull bucket storage out of `createRateLimit` into a `RateLimitStore` interface with a single atomic `increment` method. The current `Map<string, Bucket>` becomes `MemoryStore` — the default. Middleware is unchanged from outside; only the internal store is injected. Contract tests run against the interface so any future adapter is verifiable with the same suite.

**Tech Stack:** Bun, TypeScript strict, Bun test runner.

---

## File Map


| File                                 | Action                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `src/lib/rateLimitStore.ts`          | Create — `RateLimitStore` interface + `MemoryStore` class              |
| `src/middleware/rateLimitFactory.ts` | Modify — accept optional `store` in `RateLimitOptions`; delegate to it |
| `tests/rateLimitStore.test.ts`       | Create — contract tests for `RateLimitStore` + integration test        |
| `CLAUDE.md`                          | Modify — document single-process limitation and adapter contract       |


---

### Task 1: Define `RateLimitStore` interface and `MemoryStore`

**Files:**

- Create: `src/lib/rateLimitStore.ts`
- Create: `tests/rateLimitStore.test.ts`
- **Step 1: Write the failing contract tests**
  Create `tests/rateLimitStore.test.ts`:
  ```typescript
  import { describe, expect, test, beforeEach } from 'bun:test';
  import { MemoryStore } from '../src/lib/rateLimitStore';
  import type { RateLimitStore } from '../src/lib/rateLimitStore';

  function contractSuite(name: string, factory: () => RateLimitStore) {
    describe(name, () => {
      let store: RateLimitStore;
      beforeEach(() => { store = factory(); });

      test('first increment returns count 1', async () => {
        const { count } = await store.increment('key-a', 60_000);
        expect(count).toBe(1);
      });

      test('successive increments within window accumulate', async () => {
        await store.increment('key-b', 60_000);
        await store.increment('key-b', 60_000);
        const { count } = await store.increment('key-b', 60_000);
        expect(count).toBe(3);
      });

      test('resetAt is in the future', async () => {
        const { resetAt } = await store.increment('key-c', 60_000);
        expect(resetAt).toBeGreaterThan(Date.now());
      });

      test('resetAt is approximately now + windowMs', async () => {
        const before = Date.now();
        const { resetAt } = await store.increment('key-d', 60_000);
        expect(resetAt).toBeGreaterThanOrEqual(before + 59_000);
        expect(resetAt).toBeLessThanOrEqual(before + 61_000);
      });

      test('different keys are isolated', async () => {
        await store.increment('key-e', 60_000);
        const { count } = await store.increment('key-f', 60_000);
        expect(count).toBe(1);
      });
    });
  }

  contractSuite('MemoryStore', () => new MemoryStore());
  ```
- **Step 2: Run tests to confirm they fail**
  ```bash
  bun test tests/rateLimitStore.test.ts
  ```
  Expected: `Cannot find module '../src/lib/rateLimitStore'`
- **Step 3: Implement `RateLimitStore` and `MemoryStore`**
  Create `src/lib/rateLimitStore.ts`:
  ```typescript
  export interface RateLimitStore {
    /**
     * Atomically increment counter for `key`.
     * Creates the bucket if absent or expired.
     * Returns new count and ms timestamp when the window resets.
     */
    increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
    /** Release resources (close connections, clear intervals). Called on shutdown. */
    close?(): Promise<void> | void;
  }

  interface Bucket {
    count: number;
    resetAt: number;
  }

  export class MemoryStore implements RateLimitStore {
    private readonly buckets = new Map<string, Bucket>();
    private readonly interval: ReturnType<typeof setInterval>;

    constructor(cleanupIntervalMs = 60_000) {
      this.interval = setInterval(() => {
        const now = Date.now();
        for (const [key, bucket] of this.buckets) {
          if (bucket.resetAt <= now) this.buckets.delete(key);
        }
      }, cleanupIntervalMs);
      if (typeof (this.interval as { unref?: () => void }).unref === 'function') {
        (this.interval as { unref: () => void }).unref();
      }
    }

    async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
      const now = Date.now();
      const existing = this.buckets.get(key);
      if (!existing || existing.resetAt <= now) {
        const bucket: Bucket = { count: 1, resetAt: now + windowMs };
        this.buckets.set(key, bucket);
        return { count: 1, resetAt: bucket.resetAt };
      }
      existing.count += 1;
      return { count: existing.count, resetAt: existing.resetAt };
    }

    close(): void {
      clearInterval(this.interval);
    }
  }
  ```
- **Step 4: Run tests to confirm they pass**
  ```bash
  bun test tests/rateLimitStore.test.ts
  ```
  Expected: all 5 contract tests pass.

---

### Task 2: Wire `RateLimitStore` into `createRateLimit`

**Files:**

- Modify: `src/middleware/rateLimitFactory.ts`
- Modify: `tests/rateLimitStore.test.ts` (append integration test)
- **Step 1: Write the failing integration test**
  Append to `tests/rateLimitStore.test.ts`:
  ```typescript
  import { createRateLimit } from '../src/middleware/rateLimitFactory';

  describe('createRateLimit with injected store', () => {
    test('accepts a custom store and enforces max', async () => {
      const store = new MemoryStore();
      const limiter = createRateLimit({ max: 2, windowMs: 60_000, keyFn: () => 'ip', store });

      let lastStatus = 200;
      const fakeCtx = {
        req: { header: () => undefined },
        json: (_body: unknown, status = 200) => { lastStatus = status; return new Response(); },
        header: () => {},
      } as unknown as Parameters<typeof limiter.middleware>[0];

      await limiter.middleware(fakeCtx, async () => {});
      await limiter.middleware(fakeCtx, async () => {});
      await limiter.middleware(fakeCtx, async () => {}); // 3rd — over limit

      expect(lastStatus).toBe(429);
      limiter.dispose();
    });
  });
  ```
- **Step 2: Run test to confirm it fails**
  ```bash
  bun test tests/rateLimitStore.test.ts --grep "accepts a custom store"
  ```
  Expected: FAIL — `createRateLimit` doesn't accept `store` yet.
- **Step 3: Update `rateLimitFactory.ts`**
  Replace `src/middleware/rateLimitFactory.ts` with:
  ```typescript
  import type { MiddlewareHandler } from 'hono';
  import { MemoryStore, type RateLimitStore } from '../lib/rateLimitStore';
  import { AppError, toErrorResponse } from '../lib/errors';

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
    const ownedStore = !opts.store;
    const store: RateLimitStore = opts.store ?? new MemoryStore(opts.windowMs);

    const middleware: MiddlewareHandler = async (c, next) => {
      const key = opts.keyFn(c);
      const { count, resetAt } = await store.increment(key, opts.windowMs);
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

  export function clientIp(c: Parameters<MiddlewareHandler>[0]): string {
    const fwd = c.req.header('x-forwarded-for');
    if (fwd) return fwd.split(',')[0]?.trim() ?? 'unknown';
    return c.req.header('x-real-ip') ?? 'unknown';
  }
  ```
- **Step 4: Run all rate limit tests**
  ```bash
  bun test tests/rateLimitStore.test.ts
  ```
  Expected: all 6 tests pass.
- **Step 5: Run full test suite**
  ```bash
  bun test
  ```
  Expected: all tests pass. Zero regressions.
- **Step 6: Type-check**
  ```bash
  bun run typecheck
  ```
  Expected: no errors.

---

### Task 3: Document the limitation in `CLAUDE.md`

**Files:**

- Modify: `CLAUDE.md`
- **Step 1: Add rate limit note after the Shutdown paragraph**
  In `CLAUDE.md`, find the line starting `**Shutdown.`** and insert after its paragraph:
  ```markdown
  **Rate limiting.** `createRateLimit` uses an in-process `MemoryStore` by default — counters are per-replica. On horizontal deploys (N replicas), each client's effective budget is `N × RATE_LIMIT_MAX`. For strict global limits, inject a shared `RateLimitStore` via the `store` option: `createRateLimit({ …, store: myRedisStore })`. Implement `increment(key, windowMs): Promise<{ count, resetAt }>` from `src/lib/rateLimitStore.ts`.
  ```
- **Step 2: Verify typecheck still passes after CLAUDE.md edit**
  ```bash
  bun run typecheck
  ```
  Expected: no errors (CLAUDE.md is not compiled).

---

## Self-Review

**Spec coverage:**

- ✓ Pluggable store interface: `RateLimitStore` in `src/lib/rateLimitStore.ts`
- ✓ In-memory default preserved: `MemoryStore` used when no `store` injected
- ✓ Adapter pattern: `RateLimitOptions.store?: RateLimitStore`
- ✓ Contract tests: Task 1 — 5 tests against `MemoryStore`
- ✓ Integration test with injected store: Task 2 Step 1
- ✓ Docs: Task 3 — CLAUDE.md updated with limitation + interface location
- ✓ No regressions: full `bun test` + typecheck in Task 2 Steps 5-6

**Placeholder scan:** None found.

**Type consistency:**

- `RateLimitStore` defined Task 1, imported Task 2 — consistent.
- `MemoryStore` defined Task 1, used as default in Task 2 — consistent.
- `RateLimitOptions.store?: RateLimitStore` matches interface — consistent.
- `dispose: () => void` unchanged on `RateLimiter` — consistent.

