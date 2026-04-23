# Production Starter Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build production-ready Hono + Bun + libsql + Clerk starter template with reusable infrastructure (CORS, auth, rate limiting, errors, structured logging, Zod validation, dual-mode DB, graceful shutdown) — scaffolded for 10+ future projects.

**Architecture:** Single repo, two-runtime split. `src/` = Hono API (Bun runtime). `web/` = Astro 4.16 + Node SSR. API exposes `/health` + example CRUD route behind Clerk auth. DB layer auto-detects libsql (remote/Turso) vs local `bun:sqlite` file via env. Middleware chain (security → https → logger → rateLimit → cors → bodyLimit → auth → routes → error) wired by default. All user-facing strings English. No placeholder business logic.

**Tech Stack:** Hono 4.0, Bun, TypeScript 5.0 (strict), Astro 4.16 + Node SSR, Drizzle 0.30, @libsql/client 0.17, bun:sqlite fallback, @clerk/backend 3.2 (API only), Resend 4.0, Zod 3.23, Biome 2.4, Playwright.

---

## File Structure

```
Hono Template/
├── package.json                      # Root API package (Bun)
├── tsconfig.json                     # Strict TS, @/* → src/*
├── biome.json                        # Lint + format config
├── drizzle.config.ts                 # DB migration config
├── .env.example                      # Documented env vars
├── .gitignore
├── README.md                         # Per-infra docs
├── CLAUDE.md                         # Updated for new stack
├── src/
│   ├── index.ts                      # Hono app + middleware chain + shutdown
│   ├── env.ts                        # Zod-validated env loader
│   ├── db/
│   │   ├── index.ts                  # Dual-mode Drizzle client
│   │   ├── detect.ts                 # libsql vs bun-sqlite selector
│   │   ├── schema.ts                 # Example `items` table
│   │   └── migrations/.gitkeep
│   ├── lib/
│   │   ├── allowedOrigins.ts         # Env allowlist + www↔apex normalize
│   │   ├── corsOrigins.ts            # CORS config builder
│   │   ├── errors.ts                 # AppError + envelope
│   │   ├── appVersion.ts             # Package version reader
│   │   ├── forwardedProto.ts         # X-Forwarded-Proto helper
│   │   ├── safeLog.ts                # Redact secrets in logs
│   │   └── gracefulShutdown.ts       # SIGTERM/SIGINT handlers
│   ├── middleware/
│   │   ├── auth.ts                   # Clerk JWT verify + ctx
│   │   ├── bodyLimit.ts              # 100KB streaming cap
│   │   ├── error.ts                  # Unified error handler
│   │   ├── security.ts               # secureHeaders (CSP/HSTS/XFO)
│   │   ├── https.ts                  # X-Forwarded-Proto redirect
│   │   ├── rateLimitFactory.ts       # In-memory fixed-window
│   │   ├── rateLimitHealth.ts        # Per-IP throttle (English)
│   │   ├── validate.ts               # Zod middleware factory
│   │   └── requestLogger.ts          # Structured JSON logger
│   ├── routes/
│   │   ├── index.ts                  # Mount point
│   │   ├── health.ts                 # GET /health
│   │   └── items.ts                  # Example CRUD (auth + Zod)
│   └── types/
│       └── hono.d.ts                 # Hono context augmentation
├── tests/
│   ├── health.test.ts                # Unit test for /health
│   ├── rateLimit.test.ts             # Rate limiter unit test
│   ├── items.test.ts                 # CRUD integration test
│   ├── env.test.ts                   # Env validation
│   ├── errors.test.ts                # Error envelope
│   ├── lib.test.ts                   # Lib utils
│   ├── origins.test.ts               # CORS/origins
│   ├── gracefulShutdown.test.ts      # Shutdown manager
│   ├── db.test.ts                    # DB detect
│   ├── auth.test.ts                  # Auth middleware
│   └── validate.test.ts              # Zod validation
├── web/
│   ├── package.json                  # Astro package
│   ├── astro.config.mjs              # Node SSR adapter
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── env.d.ts
│       ├── lib/
│       │   └── api.ts                # getPublicApiUrl + fetch helpers
│       ├── pages/
│       │   ├── index.astro           # Minimal landing
│       │   └── api/health.ts         # SSR health proxy example
│       └── layouts/
│           └── BaseLayout.astro
└── e2e/
    ├── playwright.config.ts
    └── smoke.spec.ts                 # Basic smoke E2E
```

---

## Task 1: Clean Slate & Root Package Config

**Files:**

- Delete: entire existing `src/` (will rewrite)
- Modify: `package.json`
- Create: `.gitignore`, `biome.json`, `tsconfig.json`
- **Step 1: Remove stale source**

```bash
rm -rf src/
```

- **Step 2: Write new `package.json`**

```json
{
  "name": "hono-template",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun run --hot src/index.ts",
    "start": "bun run src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "test": "bun test",
    "test:e2e": "playwright test --config e2e/playwright.config.ts",
    "lint": "biome check src tests drizzle.config.ts web",
    "lint:fix": "biome check --write src tests drizzle.config.ts web",
    "format": "biome format --write src tests drizzle.config.ts web",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "@clerk/backend": "^3.2.0",
    "@libsql/client": "^0.17.0",
    "drizzle-orm": "^0.30.0",
    "resend": "^4.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.4.0",
    "@playwright/test": "^1.45.0",
    "@types/bun": "latest",
    "drizzle-kit": "^0.20.0",
    "typescript": "^5.0.0"
  }
}
```

- **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "types": ["bun-types"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "noEmit": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist", "web"]
}
```

- **Step 4: Write `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.0/schema.json",
  "files": { "ignoreUnknown": true, "ignore": ["dist", "node_modules", "**/migrations/**"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": { "useImportType": "error", "noNonNullAssertion": "warn" },
      "suspicious": { "noExplicitAny": "error" },
      "correctness": { "noUnusedVariables": "error", "noUnusedImports": "error" }
    }
  },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "always", "trailingCommas": "all" } }
}
```

- **Step 5: Write `.gitignore`**

```
node_modules
dist
.env
.env.local
*.db
*.db-journal
.DS_Store
playwright-report
test-results
coverage
```

- **Step 6: Install & verify**

Run: `bun install && bun run typecheck`
Expected: exit 0.

- **Step 7: Commit**

```bash
git add .
git commit -m "chore: reset template scaffold + root configs"
```

---

## Task 2: Env Validation

**Files:**

- Create: `src/env.ts`, `.env.example`
- Test: `tests/env.test.ts`
- **Step 1: Write failing test `tests/env.test.ts`**

```ts
import { describe, expect, it } from 'bun:test';
import { parseEnv } from '../src/env';

describe('parseEnv', () => {
  it('accepts minimal valid env', () => {
    const env = parseEnv({
      NODE_ENV: 'test',
      PORT: '3000',
      DATABASE_URL: 'file:./local.db',
      CLERK_SECRET_KEY: 'sk_test_x',
      CLERK_PUBLISHABLE_KEY: 'pk_test_x',
      ALLOWED_ORIGINS: 'http://localhost:4321',
      RESEND_API_KEY: 're_x',
      RATE_LIMIT_MAX: '60',
      RATE_LIMIT_WINDOW_MS: '60000',
    });
    expect(env.PORT).toBe(3000);
    expect(env.ALLOWED_ORIGINS).toEqual(['http://localhost:4321']);
  });

  it('rejects missing CLERK_SECRET_KEY', () => {
    expect(() => parseEnv({ NODE_ENV: 'test' } as never)).toThrow();
  });
});
```

- **Step 2: Run test — expect FAIL**

Run: `bun test tests/env.test.ts`
Expected: cannot find module.

- **Step 3: Write `src/env.ts`**

```ts
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  ALLOWED_ORIGINS: z
    .string()
    .min(1)
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  RESEND_API_KEY: z.string().min(1),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(raw: NodeJS.ProcessEnv | Record<string, string | undefined>): Env {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ');
    throw new Error(`Invalid environment:\n  ${issues}`);
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);
```

- **Step 4: Write `.env.example`**

```
# Runtime
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database — libsql remote (Turso) or local file
DATABASE_URL=file:./local.db
# DATABASE_URL=libsql://your-db.turso.io
# DATABASE_AUTH_TOKEN=...

# Clerk
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# CORS — comma-separated origins
ALLOWED_ORIGINS=http://localhost:4321,http://localhost:3000

# Resend
RESEND_API_KEY=re_...

# Rate limit defaults
RATE_LIMIT_MAX=60
RATE_LIMIT_WINDOW_MS=60000
```

- **Step 5: Run test — expect PASS**

Run: `bun test tests/env.test.ts`
Expected: 2 pass.

- **Step 6: Commit**

```bash
git add src/env.ts .env.example tests/env.test.ts
git commit -m "feat(env): zod-validated env loader"
```

---

## Task 3: Error Envelope & AppError

**Files:**

- Create: `src/lib/errors.ts`
- Test: `tests/errors.test.ts`
- **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { AppError, toErrorResponse } from '../src/lib/errors';

describe('AppError', () => {
  it('encodes envelope', () => {
    const err = new AppError('NOT_FOUND', 'Item missing', 404);
    expect(toErrorResponse(err)).toEqual({
      error: { code: 'NOT_FOUND', message: 'Item missing', status: 404 },
    });
  });

  it('wraps unknown errors as internal', () => {
    const res = toErrorResponse(new Error('boom'));
    expect(res.error.code).toBe('INTERNAL');
    expect(res.error.status).toBe(500);
  });
});
```

- **Step 2: Run — expect FAIL**
- **Step 3: Write `src/lib/errors.ts`**

```ts
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'VALIDATION'
  | 'INTERNAL';

export interface ErrorEnvelope {
  error: { code: ErrorCode; message: string; status: number; details?: unknown };
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function toErrorResponse(err: unknown): ErrorEnvelope {
  if (err instanceof AppError) {
    return { error: { code: err.code, message: err.message, status: err.status, details: err.details } };
  }
  return { error: { code: 'INTERNAL', message: 'Internal server error', status: 500 } };
}
```

- **Step 4: Run — expect PASS**
- **Step 5: Commit**

```bash
git add src/lib/errors.ts tests/errors.test.ts
git commit -m "feat(errors): AppError + response envelope"
```

---

## Task 4: Safe Log + App Version + Forwarded Proto

**Files:**

- Create: `src/lib/safeLog.ts`, `src/lib/appVersion.ts`, `src/lib/forwardedProto.ts`
- Test: `tests/lib.test.ts`
- **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { redact } from '../src/lib/safeLog';
import { appVersion } from '../src/lib/appVersion';
import { isHttps } from '../src/lib/forwardedProto';

describe('redact', () => {
  it('masks known secret fields', () => {
    const out = redact({ email: 'a@b.c', token: 'secret', password: 'pw', nested: { apiKey: 'k' } });
    expect(out.email).toBe('a@b.c');
    expect(out.token).toBe('[REDACTED]');
    expect(out.password).toBe('[REDACTED]');
    expect((out.nested as Record<string, unknown>).apiKey).toBe('[REDACTED]');
  });
});

describe('appVersion', () => {
  it('returns non-empty string', () => {
    expect(typeof appVersion).toBe('string');
    expect(appVersion.length).toBeGreaterThan(0);
  });
});

describe('isHttps', () => {
  it('trusts X-Forwarded-Proto=https', () => {
    expect(isHttps(new Headers({ 'x-forwarded-proto': 'https' }))).toBe(true);
    expect(isHttps(new Headers({ 'x-forwarded-proto': 'http' }))).toBe(false);
    expect(isHttps(new Headers())).toBe(false);
  });
});
```

- **Step 2: Write `src/lib/safeLog.ts`**

```ts
const SECRET_KEYS = new Set([
  'password', 'token', 'apikey', 'api_key', 'secret', 'authorization',
  'cookie', 'set-cookie', 'clerk_secret_key', 'database_auth_token', 'resend_api_key',
]);

export function redact(input: unknown): unknown {
  if (input === null || typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map(redact);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    out[key] = SECRET_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redact(value);
  }
  return out;
}
```

- **Step 3: Write `src/lib/appVersion.ts`**

```ts
import pkg from '../../package.json' with { type: 'json' };

export const appVersion: string = (pkg as { version: string }).version;
```

- **Step 4: Write `src/lib/forwardedProto.ts`**

```ts
export function isHttps(headers: Headers): boolean {
  return headers.get('x-forwarded-proto') === 'https';
}

export function forwardedProto(headers: Headers): 'http' | 'https' {
  return isHttps(headers) ? 'https' : 'http';
}
```

- **Step 5: Run — expect PASS**

Run: `bun test tests/lib.test.ts`

- **Step 6: Commit**

```bash
git add src/lib tests/lib.test.ts
git commit -m "feat(lib): safeLog redaction, appVersion, forwardedProto"
```

---

## Task 5: Allowed Origins + CORS

**Files:**

- Create: `src/lib/allowedOrigins.ts`, `src/lib/corsOrigins.ts`
- Test: `tests/origins.test.ts`
- **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { normalizeOrigins, isOriginAllowed } from '../src/lib/allowedOrigins';
import { buildCorsConfig } from '../src/lib/corsOrigins';

describe('normalizeOrigins', () => {
  it('expands www↔apex pairs', () => {
    const out = normalizeOrigins(['https://example.com']);
    expect(out).toContain('https://example.com');
    expect(out).toContain('https://www.example.com');
  });
  it('dedupes', () => {
    const out = normalizeOrigins(['https://a.com', 'https://a.com']);
    expect(out.filter((o) => o === 'https://a.com').length).toBe(1);
  });
});

describe('isOriginAllowed', () => {
  it('matches normalized', () => {
    expect(isOriginAllowed('https://www.example.com', ['https://example.com'])).toBe(true);
    expect(isOriginAllowed('https://evil.com', ['https://example.com'])).toBe(false);
  });
});

describe('buildCorsConfig', () => {
  it('returns origin function', () => {
    const cfg = buildCorsConfig(['https://example.com']);
    expect(cfg.origin('https://example.com')).toBe('https://example.com');
    expect(cfg.origin('https://evil.com')).toBe(null);
  });
});
```

- **Step 2: Write `src/lib/allowedOrigins.ts`**

```ts
export function normalizeOrigins(origins: readonly string[]): string[] {
  const out = new Set<string>();
  for (const raw of origins) {
    const origin = raw.trim().replace(/\/$/, '');
    if (!origin) continue;
    out.add(origin);
    try {
      const url = new URL(origin);
      const host = url.hostname;
      if (host.startsWith('www.')) {
        url.hostname = host.slice(4);
        out.add(url.origin);
      } else if (host.split('.').length === 2) {
        url.hostname = `www.${host}`;
        out.add(url.origin);
      }
    } catch {
      // skip invalid
    }
  }
  return [...out];
}

export function isOriginAllowed(origin: string, allowed: readonly string[]): boolean {
  return normalizeOrigins(allowed).includes(origin);
}
```

- **Step 3: Write `src/lib/corsOrigins.ts`**

```ts
import { isOriginAllowed, normalizeOrigins } from './allowedOrigins';

export interface CorsConfig {
  origin: (origin: string) => string | null;
  allowMethods: string[];
  allowHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

export function buildCorsConfig(allowed: readonly string[]): CorsConfig {
  const normalized = normalizeOrigins(allowed);
  return {
    origin: (origin) => (isOriginAllowed(origin, normalized) ? origin : null),
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86_400,
  };
}

export function clerkAuthorizedParties(allowed: readonly string[]): string[] {
  return normalizeOrigins(allowed);
}
```

- **Step 4: Run — expect PASS**
- **Step 5: Commit**

```bash
git add src/lib/allowedOrigins.ts src/lib/corsOrigins.ts tests/origins.test.ts
git commit -m "feat(cors): allowlist + www/apex normalize + config builder"
```

---

## Task 6: Graceful Shutdown

**Files:**

- Create: `src/lib/gracefulShutdown.ts`
- Test: `tests/gracefulShutdown.test.ts`
- **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { createShutdownManager } from '../src/lib/gracefulShutdown';

describe('createShutdownManager', () => {
  it('runs hooks in reverse order', async () => {
    const mgr = createShutdownManager();
    const calls: number[] = [];
    mgr.register(async () => void calls.push(1));
    mgr.register(async () => void calls.push(2));
    await mgr.shutdown();
    expect(calls).toEqual([2, 1]);
  });

  it('continues on hook error', async () => {
    const mgr = createShutdownManager();
    const calls: string[] = [];
    mgr.register(async () => void calls.push('a'));
    mgr.register(async () => { throw new Error('fail'); });
    mgr.register(async () => void calls.push('c'));
    await mgr.shutdown();
    expect(calls).toEqual(['c', 'a']);
  });
});
```

- **Step 2: Write `src/lib/gracefulShutdown.ts`**

```ts
export type ShutdownHook = () => Promise<void> | void;

export interface ShutdownManager {
  register(hook: ShutdownHook): void;
  shutdown(): Promise<void>;
  attachSignals(): void;
}

export function createShutdownManager(): ShutdownManager {
  const hooks: ShutdownHook[] = [];
  let running = false;

  const shutdown = async (): Promise<void> => {
    if (running) return;
    running = true;
    for (const hook of [...hooks].reverse()) {
      try {
        await hook();
      } catch (err) {
        console.error('[shutdown] hook failed:', err);
      }
    }
  };

  return {
    register: (hook) => void hooks.push(hook),
    shutdown,
    attachSignals: () => {
      const handle = (signal: string) => {
        console.log(`[shutdown] received ${signal}`);
        void shutdown().then(() => process.exit(0));
      };
      process.on('SIGTERM', () => handle('SIGTERM'));
      process.on('SIGINT', () => handle('SIGINT'));
    },
  };
}
```

- **Step 3: Run — expect PASS**
- **Step 4: Commit**

```bash
git add src/lib/gracefulShutdown.ts tests/gracefulShutdown.test.ts
git commit -m "feat(lib): graceful shutdown manager"
```

---

## Task 7: DB Detect + Dual-Mode Client

**Files:**

- Create: `src/db/detect.ts`, `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`, `src/db/migrations/.gitkeep`
- Test: `tests/db.test.ts`
- **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { detectDriver } from '../src/db/detect';

describe('detectDriver', () => {
  it('picks libsql for remote url', () => {
    expect(detectDriver('libsql://foo.turso.io')).toBe('libsql');
    expect(detectDriver('https://foo.turso.io')).toBe('libsql');
  });
  it('picks bun-sqlite for file url without auth token', () => {
    expect(detectDriver('file:./local.db')).toBe('bun-sqlite');
  });
  it('uses libsql for file: when auth token is set (remote embedded replica)', () => {
    expect(detectDriver('file:./local.db', 'tok')).toBe('libsql');
  });
});
```

- **Step 2: Write `src/db/detect.ts`**

```ts
export type Driver = 'libsql' | 'bun-sqlite';

export function detectDriver(url: string, authToken?: string): Driver {
  if (url.startsWith('libsql://') || url.startsWith('https://') || url.startsWith('wss://')) {
    return 'libsql';
  }
  if (url.startsWith('file:') && authToken) return 'libsql';
  return 'bun-sqlite';
}
```

- **Step 3: Write `src/db/schema.ts`**

```ts
import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const items = sqliteTable('items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
```

- **Step 4: Write `src/db/index.ts`**

```ts
import { Database } from 'bun:sqlite';
import { createClient } from '@libsql/client';
import { drizzle as drizzleBun } from 'drizzle-orm/bun-sqlite';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { env } from '../env';
import { detectDriver } from './detect';
import * as schema from './schema';

type DB =
  | ReturnType<typeof drizzleLibsql<typeof schema>>
  | ReturnType<typeof drizzleBun<typeof schema>>;

function createDb(): { db: DB; close: () => Promise<void> } {
  const driver = detectDriver(env.DATABASE_URL, env.DATABASE_AUTH_TOKEN);
  if (driver === 'libsql') {
    const client = createClient({
      url: env.DATABASE_URL,
      ...(env.DATABASE_AUTH_TOKEN ? { authToken: env.DATABASE_AUTH_TOKEN } : {}),
    });
    return {
      db: drizzleLibsql(client, { schema }),
      close: async () => client.close(),
    };
  }
  const path = env.DATABASE_URL.replace(/^file:/, '');
  const sqlite = new Database(path);
  sqlite.exec('PRAGMA journal_mode = WAL;');
  return {
    db: drizzleBun(sqlite, { schema }),
    close: async () => sqlite.close(),
  };
}

const instance = createDb();
export const db = instance.db;
export const closeDb = instance.close;
export { schema };
```

- **Step 5: Write `drizzle.config.ts`**

```ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:./local.db',
  },
} satisfies Config;
```

- **Step 6: Create migrations dir**

```bash
mkdir -p src/db/migrations && touch src/db/migrations/.gitkeep
```

- **Step 7: Run — expect PASS**

Run: `bun test tests/db.test.ts`

- **Step 8: Commit**

```bash
git add src/db drizzle.config.ts tests/db.test.ts
git commit -m "feat(db): dual-mode libsql/bun-sqlite with Drizzle"
```

---

## Task 8: Rate Limit Factory

**Files:**

- Create: `src/middleware/rateLimitFactory.ts`
- Test: `tests/rateLimit.test.ts`
- **Step 1: Write failing test**

```ts
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

  it('dispose unref\'s interval', () => {
    const limiter = createRateLimit({ max: 1, windowMs: 1000, keyFn: () => 'k' });
    expect(() => limiter.dispose()).not.toThrow();
  });
});
```

- **Step 2: Write `src/middleware/rateLimitFactory.ts`**

```ts
import type { MiddlewareHandler } from 'hono';
import { AppError } from '../lib/errors';

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
        throw new AppError('RATE_LIMITED', message, 429);
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
```

- **Step 3: Run — expect PASS**
- **Step 4: Commit**

```bash
git add src/middleware/rateLimitFactory.ts tests/rateLimit.test.ts
git commit -m "feat(middleware): rate limit factory (fixed-window, unref interval)"
```

---

## Task 9: Health Rate Limit

**Files:**

- Create: `src/middleware/rateLimitHealth.ts`
- **Step 1: Write `src/middleware/rateLimitHealth.ts`**

```ts
import { clientIp, createRateLimit, type RateLimiter } from './rateLimitFactory';

export function createHealthRateLimit(): RateLimiter {
  return createRateLimit({
    max: 30,
    windowMs: 60_000,
    keyFn: clientIp,
    message: 'Health endpoint rate limit exceeded.',
  });
}
```

- **Step 2: Commit**

```bash
git add src/middleware/rateLimitHealth.ts
git commit -m "feat(middleware): per-IP health rate limit (English)"
```

---

## Task 10: Auth Middleware (Clerk)

**Files:**

- Create: `src/types/hono.d.ts`, `src/middleware/auth.ts`
- Test: `tests/auth.test.ts`
- **Step 1: Write `src/types/hono.d.ts`**

```ts
import type {} from 'hono';

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    sessionId: string;
    requestId: string;
  }
}
```

- **Step 2: Write failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { requireAuth } from '../src/middleware/auth';

describe('requireAuth', () => {
  it('rejects missing Authorization', async () => {
    const app = new Hono();
    app.use('*', requireAuth({ verify: async () => null }));
    app.get('/', (c) => c.text('ok'));
    const res = await app.request('/');
    expect(res.status).toBe(401);
  });

  it('sets userId on valid token', async () => {
    const app = new Hono();
    app.use('*', requireAuth({ verify: async (t) => (t === 'good' ? { userId: 'u1', sessionId: 's1' } : null) }));
    app.get('/', (c) => c.text(c.get('userId')));
    const res = await app.request('/', { headers: { Authorization: 'Bearer good' } });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('u1');
  });
});
```

- **Step 3: Write `src/middleware/auth.ts`**

```ts
import { verifyToken } from '@clerk/backend';
import type { MiddlewareHandler } from 'hono';
import { clerkAuthorizedParties } from '../lib/corsOrigins';
import { AppError } from '../lib/errors';

export interface AuthSession {
  userId: string;
  sessionId: string;
}

export interface AuthOptions {
  verify: (token: string) => Promise<AuthSession | null>;
}

export function requireAuth(opts: AuthOptions): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header('authorization') ?? c.req.header('Authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token) throw new AppError('UNAUTHORIZED', 'Missing bearer token', 401);
    const session = await opts.verify(token);
    if (!session) throw new AppError('UNAUTHORIZED', 'Invalid token', 401);
    c.set('userId', session.userId);
    c.set('sessionId', session.sessionId);
    await next();
  };
}

export function createClerkVerifier(config: {
  secretKey: string;
  authorizedParties: string[];
}): AuthOptions['verify'] {
  return async (token) => {
    try {
      const payload = await verifyToken(token, {
        secretKey: config.secretKey,
        authorizedParties: clerkAuthorizedParties(config.authorizedParties),
      });
      if (!payload.sub) return null;
      return { userId: payload.sub, sessionId: (payload.sid as string | undefined) ?? '' };
    } catch {
      return null;
    }
  };
}
```

- **Step 4: Run — expect PASS**
- **Step 5: Commit**

```bash
git add src/types/hono.d.ts src/middleware/auth.ts tests/auth.test.ts
git commit -m "feat(auth): Clerk JWT middleware with pluggable verifier"
```

---

## Task 11: Body Limit, Security, HTTPS Middlewares

**Files:**

- Create: `src/middleware/bodyLimit.ts`, `src/middleware/security.ts`, `src/middleware/https.ts`
- **Step 1: Write `src/middleware/bodyLimit.ts`**

```ts
import type { MiddlewareHandler } from 'hono';
import { AppError } from '../lib/errors';

const DEFAULT_LIMIT = 100 * 1024;

export function bodyLimit(maxBytes: number = DEFAULT_LIMIT): MiddlewareHandler {
  return async (c, next) => {
    const contentLength = c.req.header('content-length');
    if (contentLength && Number(contentLength) > maxBytes) {
      throw new AppError('PAYLOAD_TOO_LARGE', `Body exceeds ${maxBytes} bytes`, 413);
    }
    const body = c.req.raw.body;
    if (body) {
      let received = 0;
      const reader = body.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > maxBytes) {
          throw new AppError('PAYLOAD_TOO_LARGE', `Body exceeds ${maxBytes} bytes`, 413);
        }
        chunks.push(value);
      }
      const merged = new Uint8Array(received);
      let off = 0;
      for (const ch of chunks) {
        merged.set(ch, off);
        off += ch.byteLength;
      }
      c.req.raw = new Request(c.req.raw.url, {
        method: c.req.raw.method,
        headers: c.req.raw.headers,
        body: merged,
      });
    }
    await next();
  };
}
```

- **Step 2: Write `src/middleware/security.ts`**

```ts
import { secureHeaders } from 'hono/secure-headers';

export const security = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", 'data:'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    frameAncestors: ["'none'"],
  },
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
});
```

- **Step 3: Write `src/middleware/https.ts`**

```ts
import type { MiddlewareHandler } from 'hono';
import { isHttps } from '../lib/forwardedProto';

export function httpsRedirect(enabled: boolean): MiddlewareHandler {
  return async (c, next) => {
    if (enabled && !isHttps(c.req.raw.headers)) {
      const url = new URL(c.req.url);
      url.protocol = 'https:';
      return c.redirect(url.toString(), 301);
    }
    await next();
  };
}
```

- **Step 4: Commit**

```bash
git add src/middleware/bodyLimit.ts src/middleware/security.ts src/middleware/https.ts
git commit -m "feat(middleware): body limit, secure headers, https redirect"
```

---

## Task 12: Request Logger + Error Middleware

**Files:**

- Create: `src/middleware/requestLogger.ts`, `src/middleware/error.ts`
- **Step 1: Write `src/middleware/requestLogger.ts`**

```ts
import type { MiddlewareHandler } from 'hono';
import { env } from '../env';
import { redact } from '../lib/safeLog';

type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function log(level: Level, payload: Record<string, unknown>): void {
  if (ORDER[level] < ORDER[env.LOG_LEVEL]) return;
  const entry = { time: new Date().toISOString(), level, ...redact(payload) as Record<string, unknown> };
  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (payload: Record<string, unknown>) => log('debug', payload),
  info: (payload: Record<string, unknown>) => log('info', payload),
  warn: (payload: Record<string, unknown>) => log('warn', payload),
  error: (payload: Record<string, unknown>) => log('error', payload),
};

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const requestId = c.req.header('x-request-id') ?? crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('x-request-id', requestId);
  const start = performance.now();
  await next();
  const durationMs = Math.round(performance.now() - start);
  logger.info({
    msg: 'request',
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs,
  });
};
```

- **Step 2: Write `src/middleware/error.ts`**

```ts
import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';
import { AppError, toErrorResponse } from '../lib/errors';
import { logger } from './requestLogger';

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get('requestId');

  if (err instanceof AppError) {
    logger.warn({ msg: 'app_error', requestId, code: err.code, status: err.status, message: err.message });
    return c.json(toErrorResponse(err), err.status as 400);
  }

  if (err instanceof ZodError) {
    const wrapped = new AppError('VALIDATION', 'Validation failed', 400, err.issues);
    logger.warn({ msg: 'validation_error', requestId, issues: err.issues });
    return c.json(toErrorResponse(wrapped), 400);
  }

  logger.error({ msg: 'unhandled_error', requestId, error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
  return c.json(toErrorResponse(err), 500);
};
```

- **Step 3: Commit** (skipped per operator — no git commit)

---

## Task 13: Zod Validation Middleware Factory

**Files:**

- Create: `src/middleware/validate.ts`
- Test: `tests/validate.test.ts`
- **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { z } from 'zod';
import { errorHandler } from '../src/middleware/error';
import { validate } from '../src/middleware/validate';

describe('validate', () => {
  it('rejects invalid json', async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.post('/', validate({ json: z.object({ name: z.string().min(1) }) }), (c) => c.json({ ok: true }));
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('exposes parsed data', async () => {
    const app = new Hono();
    app.get(
      '/',
      validate({ query: z.object({ n: z.coerce.number() }) }),
      (c) => c.json({ n: c.get('validated').query.n }),
    );
    const res = await app.request('/?n=5');
    expect(await res.json()).toEqual({ n: 5 });
  });
});
```

- **Step 2: Augment hono.d.ts**

Append to `src/types/hono.d.ts`:

```ts
declare module 'hono' {
  interface ContextVariableMap {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validated: { json?: any; query?: any; params?: any };
  }
}
```

- **Step 3: Write `src/middleware/validate.ts`**

```ts
import type { MiddlewareHandler } from 'hono';
import type { ZodSchema } from 'zod';
import { AppError } from '../lib/errors';

export interface ValidationSchemas {
  json?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schemas: ValidationSchemas): MiddlewareHandler {
  return async (c, next) => {
    const validated: Record<string, unknown> = {};

    if (schemas.json) {
      let raw: unknown;
      try {
        raw = await c.req.json();
      } catch {
        throw new AppError('BAD_REQUEST', 'Invalid JSON body', 400);
      }
      validated.json = schemas.json.parse(raw);
    }
    if (schemas.query) validated.query = schemas.query.parse(c.req.query());
    if (schemas.params) validated.params = schemas.params.parse(c.req.param());

    c.set('validated', validated as { json?: unknown; query?: unknown; params?: unknown });
    await next();
  };
}
```

- **Step 4: Run — expect PASS**
- **Step 5: Commit** (skipped — no git commit)

---

## Task 14: Health Route

**Files:**

- Create: `src/routes/health.ts`
- Test: `tests/health.test.ts`
- **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { healthRoute } from '../src/routes/health';

describe('health', () => {
  it('returns ok + version + uptime', async () => {
    const app = new Hono();
    app.route('/health', healthRoute());
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.version).toBe('string');
    expect(typeof body.uptimeSeconds).toBe('number');
  });
});
```

- **Step 2: Write `src/routes/health.ts`**

```ts
import { Hono } from 'hono';
import { appVersion } from '../lib/appVersion';

const startedAt = Date.now();

export function healthRoute(): Hono {
  const app = new Hono();
  app.get('/', (c) =>
    c.json({
      status: 'ok',
      version: appVersion,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      time: new Date().toISOString(),
    }),
  );
  return app;
}
```

- **Step 3: Run — expect PASS**
- **Step 4: Commit** (skipped — no git commit)

---

## Task 15: Example CRUD Route (Items)

**Files:**

- Create: `src/routes/items.ts`
- Test: `tests/items.test.ts`
- **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { errorHandler } from '../src/middleware/error';
import { itemsRoute } from '../src/routes/items';

const fakeAuth = {
  verify: async (t: string) => (t === 'good' ? { userId: 'u1', sessionId: 's1' } : null),
};

describe('items CRUD', () => {
  it('rejects unauthenticated', async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.route('/items', itemsRoute({ verify: fakeAuth.verify }));
    const res = await app.request('/items');
    expect(res.status).toBe(401);
  });

  it('lists items for authed user', async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.route('/items', itemsRoute({ verify: fakeAuth.verify }));
    const res = await app.request('/items', { headers: { Authorization: 'Bearer good' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
  });
});
```

- **Step 2: Write `src/routes/items.ts`**

```ts
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db';
import { items } from '../db/schema';
import { AppError } from '../lib/errors';
import { type AuthOptions, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

const updateSchema = createSchema.partial();

const idParams = z.object({ id: z.string().uuid() });

export function itemsRoute(auth: AuthOptions): Hono {
  const app = new Hono();
  app.use('*', requireAuth(auth));

  app.get('/', async (c) => {
    const ownerId = c.get('userId');
    const rows = await db.select().from(items).where(eq(items.ownerId, ownerId));
    return c.json({ items: rows });
  });

  app.post('/', validate({ json: createSchema }), async (c) => {
    const ownerId = c.get('userId');
    const body = c.get('validated').json as z.infer<typeof createSchema>;
    const [row] = await db.insert(items).values({ ownerId, ...body }).returning();
    return c.json({ item: row }, 201);
  });

  app.get('/:id', validate({ params: idParams }), async (c) => {
    const ownerId = c.get('userId');
    const { id } = c.get('validated').params as z.infer<typeof idParams>;
    const [row] = await db.select().from(items).where(and(eq(items.id, id), eq(items.ownerId, ownerId)));
    if (!row) throw new AppError('NOT_FOUND', 'Item not found', 404);
    return c.json({ item: row });
  });

  app.patch('/:id', validate({ params: idParams, json: updateSchema }), async (c) => {
    const ownerId = c.get('userId');
    const { id } = c.get('validated').params as z.infer<typeof idParams>;
    const body = c.get('validated').json as z.infer<typeof updateSchema>;
    const [row] = await db
      .update(items)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(items.id, id), eq(items.ownerId, ownerId)))
      .returning();
    if (!row) throw new AppError('NOT_FOUND', 'Item not found', 404);
    return c.json({ item: row });
  });

  app.delete('/:id', validate({ params: idParams }), async (c) => {
    const ownerId = c.get('userId');
    const { id } = c.get('validated').params as z.infer<typeof idParams>;
    const [row] = await db
      .delete(items)
      .where(and(eq(items.id, id), eq(items.ownerId, ownerId)))
      .returning();
    if (!row) throw new AppError('NOT_FOUND', 'Item not found', 404);
    return c.json({ ok: true });
  });

  return app;
}
```

- **Step 3: Run — expect PASS**
- **Step 4: Commit** (skipped — no git commit; added `tests/preload.ts` + `bunfig.toml` test preload for isolated SQLite + `items` DDL)

---

## Task 16: Route Mount Point

**Files:**

- Create: `src/routes/index.ts`
- **Step 1: Write `src/routes/index.ts`**

```ts
import { Hono } from 'hono';
import { type AuthOptions } from '../middleware/auth';
import { healthRoute } from './health';
import { itemsRoute } from './items';

export function mountRoutes(auth: AuthOptions): Hono {
  const app = new Hono();
  app.route('/health', healthRoute());
  app.route('/items', itemsRoute(auth));
  return app;
}
```

- **Step 2: Commit** (skipped)

---

## Task 17: Main Entry — Wire Everything

**Files:**

- Create: `src/index.ts`
- **Step 1: Write `src/index.ts`**

```ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { closeDb } from './db';
import { env } from './env';
import { buildCorsConfig } from './lib/corsOrigins';
import { createShutdownManager } from './lib/gracefulShutdown';
import { createClerkVerifier, type AuthOptions } from './middleware/auth';
import { bodyLimit } from './middleware/bodyLimit';
import { errorHandler } from './middleware/error';
import { httpsRedirect } from './middleware/https';
import { createRateLimit, clientIp } from './middleware/rateLimitFactory';
import { createHealthRateLimit } from './middleware/rateLimitHealth';
import { logger, requestLogger } from './middleware/requestLogger';
import { security } from './middleware/security';
import { mountRoutes } from './routes';

const app = new Hono();
const shutdown = createShutdownManager();

app.onError(errorHandler);

app.use('*', security);
app.use('*', httpsRedirect(env.NODE_ENV === 'production'));
app.use('*', requestLogger);

const globalLimiter = createRateLimit({
  max: env.RATE_LIMIT_MAX,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  keyFn: clientIp,
});
shutdown.register(globalLimiter.dispose);
app.use('*', globalLimiter.middleware);

const healthLimiter = createHealthRateLimit();
shutdown.register(healthLimiter.dispose);
app.use('/health', healthLimiter.middleware);

app.use('*', cors(buildCorsConfig(env.ALLOWED_ORIGINS)));
app.use('*', bodyLimit());

const auth: AuthOptions = {
  verify: createClerkVerifier({
    secretKey: env.CLERK_SECRET_KEY,
    authorizedParties: env.ALLOWED_ORIGINS,
  }),
};

app.route('/', mountRoutes(auth));

shutdown.register(async () => {
  await closeDb();
});
shutdown.attachSignals();

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

logger.info({ msg: 'server_started', port: env.PORT, env: env.NODE_ENV });

shutdown.register(async () => {
  server.stop();
});
```

- **Step 2: Verify typecheck** (`bun run typecheck` — pass)
- **Step 3: Verify boots** (`curl http://localhost:3000/health` — user verified)
- **Step 4: Commit** (skipped)

---

## Task 18: Astro Web Subproject

**Files:**

- Create: `web/package.json`, `web/astro.config.mjs`, `web/tsconfig.json`, `web/.env.example`, `web/src/env.d.ts`, `web/src/lib/api.ts`, `web/src/layouts/BaseLayout.astro`, `web/src/pages/index.astro`, `web/src/pages/api/health.ts`
- **Step 1: Write `web/package.json`**

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "start": "node ./dist/server/entry.mjs",
    "typecheck": "astro check && tsc --noEmit"
  },
  "dependencies": {
    "@astrojs/node": "^8.3.0",
    "astro": "^4.16.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.0.0"
  }
}
```

- **Step 2: Write `web/astro.config.mjs`**

```js
import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { port: 4321 },
});
```

- **Step 3: Write `web/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*", ".astro/types.d.ts"],
  "exclude": ["dist", "node_modules"]
}
```

- **Step 4: Write `web/.env.example`**

```
PUBLIC_API_URL=http://localhost:3000
```

- **Step 5: Write `web/src/env.d.ts`**

```ts
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- **Step 6: Write `web/src/lib/api.ts`**

```ts
export function getPublicApiUrl(): string {
  const url = import.meta.env.PUBLIC_API_URL;
  if (!url) throw new Error('PUBLIC_API_URL is not configured');
  return url.replace(/\/$/, '');
}

export async function apiFetch(path: string, init: RequestInit & { token?: string } = {}): Promise<Response> {
  const { token, headers, ...rest } = init;
  const h = new Headers(headers);
  if (token) h.set('Authorization', `Bearer ${token}`);
  h.set('Accept', 'application/json');
  return fetch(`${getPublicApiUrl()}${path}`, { ...rest, headers: h });
}
```

- **Step 7: Write `web/src/layouts/BaseLayout.astro`**

```astro
---
interface Props {
  title: string;
}
const { title } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
  </head>
  <body>
    <main>
      <slot />
    </main>
  </body>
</html>
```

- **Step 8: Write `web/src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getPublicApiUrl } from '../lib/api';
const apiUrl = getPublicApiUrl();
---
<BaseLayout title="Template">
  <h1>Hono + Astro Template</h1>
  <p>API: <code>{apiUrl}</code></p>
  <p><a href="/api/health">Health proxy</a></p>
</BaseLayout>
```

- **Step 9: Write `web/src/pages/api/health.ts`**

```ts
import type { APIRoute } from 'astro';
import { apiFetch } from '../../lib/api';

export const GET: APIRoute = async () => {
  const res = await apiFetch('/health');
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
};
```

- **Step 10: Install web deps + typecheck** (`cd web && bun install && bunx astro sync && bun run typecheck`; `PUBLIC_API_URL=... bun run build` verified)
- **Step 11: Commit** (skipped)

---

## Task 19: Playwright E2E Smoke

**Files:**

- Create: `e2e/playwright.config.ts`, `e2e/smoke.spec.ts`
- **Step 1: Write `e2e/playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  use: { baseURL: process.env.WEB_URL ?? 'http://localhost:4321' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
```

- **Step 2: Write `e2e/smoke.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test('landing renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Template');
});
```

- **Step 3: Commit** (skipped)

**Notes:** Root `test:e2e` uses `playwright test --config e2e/playwright.config.ts` so Playwright discovers the nested config. On Apple Silicon, run `bunx playwright install chromium --force` once if browsers were first installed under the wrong arch. Start the web app (`cd web && PUBLIC_API_URL=http://localhost:3000 bun run dev`) before `bun run test:e2e`, or set `WEB_URL` if using a different origin.

---

## Task 20: README + CLAUDE.md Update

**Files:**

- Create: `README.md`
- Modify: `CLAUDE.md`
- **Step 1: Write `README.md`** — aligned with shipped stack (commands, `bunfig`/preload tests, E2E, `/items`, web health proxy).
- **Step 2: Update `CLAUDE.md`** — production stack, middleware order, shutdown, tests/E2E notes.
- **Step 3: Commit** (skipped)

---

## Task 21: Final Verification

- **Step 1: Install all deps**

Run: `bun install && cd web && bun install && cd ..`

- **Step 2: Full typecheck**

Run: `bun run typecheck`
Expected: exit 0.

- **Step 3: Lint**

Run: `bun run lint`
Expected: no errors.

- **Step 4: All unit tests**

Run: `bun test`
Expected: all pass.

- **Step 5: Boot smoke**

Run: `bun run dev &`, then `sleep 2 && curl -s localhost:3000/health | grep -q '"status":"ok"'`, then kill.

- **Step 6: Final commit**

```bash
git add -A
git commit --allow-empty -m "chore: template scaffold verified"
```

**Verification (2026-04-23):** `bun install && (cd web && bun install)` OK; `bun run typecheck`, `bun run lint`, and `bun test` pass; API `/health` smoke with minimal env OK. Final git commit (Step 6) left to the repo owner if desired.