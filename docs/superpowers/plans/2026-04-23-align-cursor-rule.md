# Align `.cursor/rules/hono-template.mdc` with Repo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `.cursor/rules/hono-template.mdc` so every stack entry, symbol name, and convention matches the actual source code and `CLAUDE.md`.

**Architecture:** Pure documentation fix — no code changes, no tests. Diff the rule against real symbols in `src/`; replace wrong sections; delete references to removed code (Stripe, `errorResponse`, `successResponse`, `authMiddleware`, shared-types `index.ts`).

**Tech Stack:** Markdown / MDC (Cursor rule format). Read-only audit of TypeScript source files to verify symbols before writing.

---

## Stale Sections — Quick Reference


| Rule claims                            | Reality (verified in source)                                        |
| -------------------------------------- | ------------------------------------------------------------------- |
| DB: PostgreSQL                         | `src/db/index.ts` → `bun:sqlite` or `@libsql/client` (env-detected) |
| Payments: Stripe                       | `src/lib/stripe.ts` deleted; no Stripe code exists                  |
| `errorResponse(c, …)`                  | Actual: `throw new AppError(…)` from `src/lib/errors.ts`            |
| `successResponse(c, …)`                | Does not exist; handlers return `c.json({…})` directly              |
| `AppError` from `src/middleware/error` | Actual: exported from `src/lib/errors.ts`                           |
| `authMiddleware`                       | Actual: `requireAuth(auth)` from `src/middleware/auth.ts`           |
| Routes mounted under `/api`            | Actual: mounted at `/` — `/health`, `/items`                        |
| Shared types `src/types/index.ts`      | File deleted; types defined inline or via Drizzle infer             |
| `DECISIONS.md`, `CHANGELOG.md`         | Neither file exists in repo                                         |


---

### Task 1: Audit — verify every symbol against source

**Files:**

- Read: `.cursor/rules/hono-template.mdc`
- Read: `src/lib/errors.ts`
- Read: `src/middleware/auth.ts`
- Read: `src/routes/index.ts`
- Read: `src/db/index.ts`
- **Step 1: Verify `AppError` source and signature**
Read `src/lib/errors.ts`. Confirm exports: `ErrorCode`, `ErrorEnvelope`, `AppError`, `toErrorResponse`.
Confirm `AppError` constructor: `new AppError(code: ErrorCode, message: string, status: number, details?: unknown)`.
Confirm `errorResponse` and `successResponse` do NOT exist.
- **Step 2: Verify auth symbol**
Read `src/middleware/auth.ts`. Confirm exported symbols: `AuthSession`, `AuthOptions`, `requireAuth(opts: AuthOptions)`, `createClerkVerifier(config)`.
Confirm `authMiddleware` does NOT exist.
- **Step 3: Verify route mount paths**
Read `src/routes/index.ts`. Confirm routes mounted at `/health` and `/items` (no `/api` prefix).
- **Step 4: Verify DB driver**
Read `src/db/index.ts`. Confirm: no `pg` / `postgres` import. Driver is `bun:sqlite` or `@libsql/client` based on `DATABASE_URL` prefix.
- **Step 5: Verify Stripe and types/index deleted**
  ```bash
  ls src/lib/stripe.ts 2>/dev/null && echo "EXISTS" || echo "CONFIRMED DELETED"
  ls src/types/index.ts 2>/dev/null && echo "EXISTS" || echo "CONFIRMED DELETED"
  ```
  Expected: both print `CONFIRMED DELETED`.

---

### Task 2: Rewrite `.cursor/rules/hono-template.mdc`

**Files:**

- Modify: `.cursor/rules/hono-template.mdc` (full rewrite)
- **Step 1: Replace file contents**
Replace the entire file with:
  ```markdown
  ---
  description: This project uses the hono-template stack; apply its conventions and patterns.
  alwaysApply: true
  ---

  # hono-template

  This project was created from **hono-template**. Use these conventions so rules and skills apply correctly.

  ## Stack

  - **Runtime:** Bun
  - **Framework:** Hono 4
  - **Database:** libsql / bun:sqlite + Drizzle ORM (driver auto-selected from `DATABASE_URL` prefix: `file:` → bun:sqlite, `libsql:`/`https:` → @libsql/client)
  - **Auth:** Clerk — API-only JWT verify via `@clerk/backend`
  - **Email:** Resend (configured via `RESEND_API_KEY` — no email routes exist yet)
  - **Validation:** Zod with `validate()` middleware from `src/middleware/validate.ts`

  ## Conventions

  ### Errors

  - Import `AppError` from `src/lib/errors.ts` (NOT from `src/middleware/error`).
  - **Throw** `new AppError(code, message, httpStatus)` from route handlers for known errors. The global `errorHandler` in `src/middleware/error.ts` catches it and formats the JSON envelope automatically.
  - Never call `c.json({ error: … })` directly for error cases.
  - Valid error codes (`ErrorCode` union in `src/lib/errors.ts`): `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`, `VALIDATION`, `INTERNAL`.

  ```typescript
  // CORRECT
  import { AppError } from '../lib/errors';
  if (!row) throw new AppError('NOT_FOUND', 'Item not found', 404);

  // WRONG — never do this
  return c.json({ error: 'not found' }, 404);
  ```
  ### Auth
  - Auth is injected as `AuthOptions` (from `src/middleware/auth.ts`) into route factory functions.
  - Protect a route group with `app.use('*', requireAuth(auth))`.
  - After the middleware runs, read `c.get('userId')` and `c.get('sessionId')` — typed via `src/types/hono.d.ts`.
  ```typescript
  import { requireAuth, type AuthOptions } from '../middleware/auth';

  export function myRoute(auth: AuthOptions): Hono {
    const app = new Hono();
    app.use('*', requireAuth(auth));
    // c.get('userId') available in all handlers below
    return app;
  }
  ```
  ### Validation
  - Use `validate({ json, query, params })` from `src/middleware/validate.ts` with Zod schemas.
  - Read validated data via `c.get('validated').json`, `.query`, `.params`.
  ```typescript
  import { validate } from '../middleware/validate';
  import { z } from 'zod';

  const createSchema = z.object({ name: z.string().min(1).max(200) });

  app.post('/', validate({ json: createSchema }), async (c) => {
    const body = c.get('validated').json as z.infer<typeof createSchema>;
  });
  ```
  ### Routes
  - Add route files under `src/routes/` and register in `src/routes/index.ts` via `app.route('/path', myRoute(auth))`.
  - Routes mount at `/` (not `/api`). Existing routes: `/health`, `/items`.
  - Keep handlers thin — business logic belongs in `src/lib/`.
  ### Database
  - Import `db` from `src/db/index.ts`. Never create new connections elsewhere.
  - Define tables in `src/db/schema.ts` using SQLite Drizzle helpers (`sqliteTable`, `text`, `integer`).
  - Use `crypto.randomUUID()` via `$defaultFn` for primary key `id` fields.
  - After schema changes: `bun run db:generate` → review generated SQL → `bun run db:migrate`.
  ### Environment
  - Only `src/env.ts` reads `process.env`. Import `env` from there everywhere else — never `process.env` in handlers.
  - Required vars: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `ALLOWED_ORIGINS`, `RESEND_API_KEY`.
  - Optional vars: `PORT`, `NODE_ENV`, `LOG_LEVEL`, `DATABASE_AUTH_TOKEN`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`.
  ### Types
  - Context variable types are declared via module augmentation in `src/types/hono.d.ts`. Add new context vars there.
  - Use `z.infer<typeof schema>` for Zod-derived types.
  - Use Drizzle's `$inferSelect` / `$inferInsert` for DB row types (see `src/db/schema.ts`).
  ```

  ```
- **Step 2: Verify no stale terms remain**
  ```bash
  grep -c "PostgreSQL\|Stripe\|errorResponse\|successResponse\|authMiddleware\|/api\|types/index\|DECISIONS.md\|CHANGELOG.md" .cursor/rules/hono-template.mdc
  ```
  Expected output: `0`
- **Step 3: Verify key correct terms present**
  ```bash
  grep -c "AppError\|requireAuth\|validate\|bun:sqlite\|libsql" .cursor/rules/hono-template.mdc
  ```
  Expected output: `5` (one match each, or higher — any non-zero count confirms presence).
- **Step 4: Commit**
  ```bash
  git add .cursor/rules/hono-template.mdc
  git commit -m "docs(cursor): align hono-template rule with real stack and symbols"
  ```

---

## Self-Review

**Spec coverage:**

- ✓ DB: PostgreSQL → libsql/bun:sqlite with env-detection explained
- ✓ Stripe section: removed entirely
- ✓ `errorResponse` / `successResponse`: replaced with `AppError` throw pattern + code example
- ✓ `authMiddleware`: replaced with `requireAuth(auth)` + code example
- ✓ Routes under `/api`: corrected to `/`
- ✓ `src/types/index.ts`: removed; module-augmentation approach documented
- ✓ `DECISIONS.md` / `CHANGELOG.md`: removed (files don't exist)
- ✓ Validation middleware: added (was missing from original rule)
- ✓ Env convention: added (critical — `process.env` must not be read directly)

**Placeholder scan:** None found. All sections have concrete symbols, import paths, or code examples.

**Type consistency:** Single-task rewrite — no cross-task type references.