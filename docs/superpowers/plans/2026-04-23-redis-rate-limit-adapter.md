# Redis RateLimitStore Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `RedisRateLimitStore` backed by `@upstash/redis` so horizontally-scaled replicas share one rate-limit counter per IP, with automatic fallback to `MemoryStore` when `REDIS_URL` is absent.

**Architecture:** `RedisRateLimitStore` implements the existing `RateLimitStore` interface (`src/lib/rateLimitStore.ts`) using Upstash's HTTP REST client. Fixed-window atomic pipeline: `INCR` + `EXPIREAT` in a single round-trip — idempotent because window boundary is deterministic (`Math.ceil(now/windowMs)*windowMs`). `rateLimitFactory.ts` wraps `store.increment()` in try/catch (fail-open: log warn, pass request). `src/index.ts` creates one shared store instance passed to both limiters. `REDIS_URL` absent → both limiters use their default `MemoryStore`.

**Tech Stack:** Bun, TypeScript strict, Bun test runner, `@upstash/redis`.

---

## File Map


| File                                 | Action                                                   |
| ------------------------------------ | -------------------------------------------------------- |
| `src/env.ts`                         | Modify — add `REDIS_URL`, `REDIS_TOKEN` optional vars    |
| `src/lib/safeLog.ts`                 | Modify — add `redis_url`, `redis_token` to `SECRET_KEYS` |
| `.env.example`                       | Modify — add commented Redis block                       |
| `src/lib/rateLimitStore.ts`          | Modify — append `RedisRateLimitStore` class              |
| `src/middleware/rateLimitFactory.ts` | Modify — fail-open try/catch around `store.increment()`  |
| `src/middleware/rateLimitHealth.ts`  | Modify — add optional `store` param                      |
| `src/index.ts`                       | Modify — create shared store, pass to both limiters      |
| `tests/rateLimitStore.test.ts`       | Create/append — Redis contract + fail-open tests         |


---

### Task 1: Add env vars + safeLog + .env.example

**Files:**

- Modify: `src/env.ts`
- Modify: `src/lib/safeLog.ts`
- Modify: `.env.example`
- **Step 1: Add `REDIS_URL` and `REDIS_TOKEN` to env schema**
  In `src/env.ts`, add two lines after the `TRUST_PROXY` block (before `LOG_LEVEL`):
  ```typescript
  /** Upstash Redis REST URL. When set, rate limiters share a Redis counter across replicas. */
  REDIS_URL: z.string().url().optional(),
  /** Upstash Redis REST token. Required when REDIS_URL is set. */
  REDIS_TOKEN: z.string().min(1).optional(),
  ```
- **Step 2: Add redis keys to safeLog redaction set**
  In `src/lib/safeLog.ts`, add two entries to `SECRET_KEYS`:
  ```typescript
  'redis_url',
  'redis_token',
  ```
- **Step 3: Add Redis block to .env.example**
  Append after the `TRUST_PROXY` line in `.env.example`:
  ```
  # Redis (optional) — shared rate-limit counter across replicas (Upstash REST)
  # REDIS_URL=https://your-db.upstash.io
  # REDIS_TOKEN=your-upstash-token
  ```
- **Step 4: Typecheck**
  ```bash
  bun run typecheck
  ```
  Expected: no errors.

---

### Task 2: Install @upstash/redis

**Files:** `package.json`, `bun.lockb`

- **Step 1: Install the package**
  ```bash
  bun add @upstash/redis
  ```
  Expected: package added, no errors.

---

### Task 3: RedisRateLimitStore — write failing tests

**Files:**

- Create/append: `tests/rateLimitStore.test.ts`
- **Step 1: Write failing tests**
  Create `tests/rateLimitStore.test.ts` (or append if it exists):
  ```typescript
  import { describe, expect, test } from 'bun:test';
  import { RedisRateLimitStore } from '../src/lib/rateLimitStore';

  // ---------- mock helpers ----------

  type FakePipe = {
    incr: (key: string) => FakePipe;
    expireat: (key: string, ts: number) => FakePipe;
    exec: () => Promise<[number, number]>;
  };

  function makeMockRedis(incrSequence: number[]): { pipeline: () => FakePipe } {
    let call = 0;
    return {
      pipeline: (): FakePipe => ({
        incr: (_key: string) => ({} as FakePipe),
        expireat: (_key: string, _ts: number) => ({} as FakePipe),
        exec: async () => {
          const n = incrSequence[call++] ?? 1;
          return [n, 1];
        },
      }),
    };
  }

  function makeThrowingRedis(): { pipeline: () => FakePipe } {
    return {
      pipeline: (): FakePipe => ({
        incr: (_key: string) => ({} as FakePipe),
        expireat: (_key: string, _ts: number) => ({} as FakePipe),
        exec: async () => { throw new Error('Redis connection refused'); },
      }),
    };
  }

  // ---------- contract tests ----------

  describe('RedisRateLimitStore', () => {
    test('first call returns count 1', async () => {
      const store = new RedisRateLimitStore(makeMockRedis([1]) as never);
      const { count } = await store.increment('ip:1', 60_000);
      expect(count).toBe(1);
    });

    test('second call returns count 2', async () => {
      const store = new RedisRateLimitStore(makeMockRedis([1, 2]) as never);
      await store.increment('ip:2', 60_000);
      const { count } = await store.increment('ip:2', 60_000);
      expect(count).toBe(2);
    });

    test('resetAt is a fixed window boundary in the future', async () => {
      const windowMs = 60_000;
      const before = Date.now();
      const store = new RedisRateLimitStore(makeMockRedis([1]) as never);
      const { resetAt } = await store.increment('ip:3', windowMs);
      const expectedBoundary = Math.ceil(before / windowMs) * windowMs;
      // allow ±1 window in case of boundary crossing during test
      expect(resetAt).toBeGreaterThanOrEqual(expectedBoundary);
      expect(resetAt).toBeLessThanOrEqual(expectedBoundary + windowMs);
    });

    test('close() does not throw (no-op for HTTP client)', () => {
      const store = new RedisRateLimitStore(makeMockRedis([1]) as never);
      expect(() => store.close()).not.toThrow();
    });

    test('propagates underlying Redis error to caller', async () => {
      const store = new RedisRateLimitStore(makeThrowingRedis() as never);
      await expect(store.increment('ip:4', 60_000)).rejects.toThrow('Redis connection refused');
    });
  });
  ```
- **Step 2: Run tests to confirm they fail**
  ```bash
  bun test tests/rateLimitStore.test.ts --grep "RedisRateLimitStore"
  ```
  Expected: FAIL — `RedisRateLimitStore` is not exported yet.

---

### Task 4: Implement RedisRateLimitStore

**Files:**

- Modify: `src/lib/rateLimitStore.ts`
- **Step 1: Append RedisRateLimitStore to rateLimitStore.ts**
  Append to the bottom of `src/lib/rateLimitStore.ts`:
  ```typescript
  import type { Redis } from '@upstash/redis';

  export class RedisRateLimitStore implements RateLimitStore {
    constructor(private readonly redis: Redis) {}

    async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
      const nowMs = Date.now();
      // Fixed-window boundary: same resetAt for all requests in the same window.
      // Idempotent EXPIREAT — setting the same second on every INCR within the window is safe.
      const resetAt = Math.ceil(nowMs / windowMs) * windowMs;
      const resetAtSec = Math.ceil(resetAt / 1000);

      const pipe = this.redis.pipeline();
      pipe.incr(key);
      pipe.expireat(key, resetAtSec);
      const results = await pipe.exec() as [number, number];
      return { count: results[0], resetAt };
    }

    close(): void {
      // @upstash/redis uses HTTP — no persistent connection to close.
    }
  }
  ```
- **Step 2: Run RedisRateLimitStore tests**
  ```bash
  bun test tests/rateLimitStore.test.ts --grep "RedisRateLimitStore"
  ```
  Expected: all 5 tests pass.
- **Step 3: Typecheck**
  ```bash
  bun run typecheck
  ```
  Expected: no errors.

---

### Task 5: Fail-open — write failing test

**Files:**

- Modify: `tests/rateLimit.test.ts`
- **Step 1: Append fail-open test**
  Append to `tests/rateLimit.test.ts`:
  ```typescript
  import type { RateLimitStore } from '../src/lib/rateLimitStore';

  describe('fail-open behavior', () => {
    it('passes request through when store.increment throws', async () => {
      const brokenStore: RateLimitStore = {
        increment: async () => { throw new Error('store down'); },
      };

      const app = new Hono();
      const limiter = createRateLimit({ max: 1, windowMs: 1000, keyFn: () => 'k', store: brokenStore });
      app.use('*', limiter.middleware);
      app.get('/', (c) => c.text('ok'));

      const r = await app.request('/');
      expect(r.status).toBe(200);
      limiter.dispose();
    });
  });
  ```
- **Step 2: Run to confirm it fails**
  ```bash
  bun test tests/rateLimit.test.ts --grep "fail-open"
  ```
  Expected: FAIL — middleware throws instead of passing through.

---

### Task 6: Implement fail-open in rateLimitFactory

**Files:**

- Modify: `src/middleware/rateLimitFactory.ts`
- **Step 1: Add logger import**
  In `src/middleware/rateLimitFactory.ts`, add after existing imports:
  ```typescript
  import { logger } from '../middleware/requestLogger';
  ```
- **Step 2: Replace middleware function body with fail-open try/catch**
  Replace the `const middleware: MiddlewareHandler = async (c, next) => { ... }` block:
  ```typescript
  const middleware: MiddlewareHandler = async (c, next) => {
    const key = opts.keyFn(c);
    let count: number;
    let resetAt: number;
    try {
      ({ count, resetAt } = await store.increment(key, opts.windowMs));
    } catch (err) {
      logger.warn({ msg: 'rate_limit_store_error', err });
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
  ```
- **Step 3: Run fail-open test**
  ```bash
  bun test tests/rateLimit.test.ts --grep "fail-open"
  ```
  Expected: PASS.
- **Step 4: Run full test suite**
  ```bash
  bun test
  ```
  Expected: all tests pass, zero regressions.
- **Step 5: Typecheck**
  ```bash
  bun run typecheck
  ```
  Expected: no errors.

---

### Task 7: Update createHealthRateLimit to accept store

**Files:**

- Modify: `src/middleware/rateLimitHealth.ts`
- **Step 1: Replace file content**
  Replace `src/middleware/rateLimitHealth.ts` with:
  ```typescript
  import type { RateLimitStore } from '../lib/rateLimitStore';
  import { clientIp, createRateLimit, type RateLimiter } from './rateLimitFactory';

  export function createHealthRateLimit(store?: RateLimitStore): RateLimiter {
    return createRateLimit({
      max: 30,
      windowMs: 60_000,
      keyFn: clientIp,
      message: 'Health endpoint rate limit exceeded.',
      ...(store ? { store } : {}),
    });
  }
  ```
- **Step 2: Typecheck**
  ```bash
  bun run typecheck
  ```
  Expected: no errors.

---

### Task 8: Wire shared store in index.ts

**Files:**

- Modify: `src/index.ts`
- **Step 1: Add imports**
  In `src/index.ts`, add after existing imports:
  ```typescript
  import { Redis } from '@upstash/redis';
  import { RedisRateLimitStore, type RateLimitStore } from './lib/rateLimitStore';
  ```
- **Step 2: Add createSharedStore helper**
  After `const shutdown = createShutdownManager();`, add:
  ```typescript
  function createSharedStore(): RateLimitStore | undefined {
    if (!env.REDIS_URL || !env.REDIS_TOKEN) return undefined;
    return new RedisRateLimitStore(new Redis({ url: env.REDIS_URL, token: env.REDIS_TOKEN }));
  }

  const sharedStore = createSharedStore();
  ```
- **Step 3: Pass sharedStore to globalLimiter**
  Replace the `globalLimiter` declaration:
  ```typescript
  const globalLimiter = createRateLimit({
    max: env.RATE_LIMIT_MAX,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    keyFn: clientIp,
    ...(sharedStore ? { store: sharedStore } : {}),
  });
  ```
- **Step 4: Pass sharedStore to healthLimiter**
  Replace the `healthLimiter` declaration:
  ```typescript
  const healthLimiter = createHealthRateLimit(sharedStore);
  ```
- **Step 5: Register store close on shutdown**
  Before `shutdown.attachSignals()`, add:
  ```typescript
  if (sharedStore?.close) {
    shutdown.register(async () => { await sharedStore.close?.(); });
  }
  ```
- **Step 6: Run full test suite**
  ```bash
  bun test
  ```
  Expected: all tests pass.
- **Step 7: Typecheck**
  ```bash
  bun run typecheck
  ```
  Expected: no errors.
- **Step 8: Lint**
  ```bash
  bun run lint
  ```
  Expected: no errors.

---

## Self-Review

**Spec coverage (from TODOS.md L11–16):**


| Requirement                                          | Task                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `RedisRateLimitStore` in `src/lib/rateLimitStore.ts` | Task 4                                                                          |
| Implements `RateLimitStore` interface                | Task 4 — `implements RateLimitStore`                                            |
| Uses `@upstash/redis` (HTTP-based)                   | Task 2 + Task 4                                                                 |
| Atomic `INCR` + `EXPIREAT` via pipeline              | Task 4 — `pipe.incr` + `pipe.expireat`                                          |
| `REDIS_URL` optional env var                         | Task 1                                                                          |
| Absent `REDIS_URL` = MemoryStore fallback            | Task 8 — `createSharedStore` returns `undefined` → default `MemoryStore`        |
| Both limiters share same store instance              | Task 8 — `sharedStore` passed to both                                           |
| Fail-open on store error                             | Task 6 — try/catch, log `rate_limit_store_error`, `next()`                      |
| `msg: 'rate_limit_store_error'` warn log             | Task 6                                                                          |
| `Math.ceil(resetAt / 1000)` for EXPIREAT             | Task 4 — `const resetAtSec = Math.ceil(resetAt / 1000)`                         |
| `REDIS_URL` to `.env.example`                        | Task 1                                                                          |
| `REDIS_URL` to `safeLog.ts` SECRET_KEYS              | Task 1                                                                          |
| Tests: Redis contract                                | Task 3 + 4 — 5 tests                                                            |
| Tests: fail-open                                     | Task 5 + 6                                                                      |
| Tests: MemoryStore fallback when no `REDIS_URL`      | Covered by existing `rateLimit.test.ts` — no store passed → MemoryStore default |


**Placeholder scan:** None found.

**Type consistency:**

- `RedisRateLimitStore` defined Task 4, imported Task 8 — consistent.
- `RateLimitStore` interface unchanged — all impls compatible.
- `createHealthRateLimit(store?: RateLimitStore)` Task 7 — used in Task 8 with `sharedStore` typed `RateLimitStore | undefined` — consistent.
- `sharedStore?.close` — optional chaining correct, `close?()` is optional on interface.

