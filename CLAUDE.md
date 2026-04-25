# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack


| Layer      | Choice                                                                   |
| ---------- | ------------------------------------------------------------------------ |
| API        | Hono 4 + Bun, TypeScript strict                                          |
| Web        | Astro 4.16, Node SSR (`@astrojs/node` standalone)                        |
| DB         | Drizzle 0.30 + `@libsql/client` or `bun:sqlite` (see `src/db/detect.ts`) |
| Auth       | `@clerk/backend` — API-only JWT verify                                   |
| Email      | Resend                                                                   |
| Validation | Zod                                                                      |
| API tests  | Bun test runner                                                          |
| E2E        | Playwright (`e2e/playwright.config.ts`)                                  |
| Lint       | Biome (API root; `web/` is separate)                                     |


## Commands

```bash
bun run dev              # API :3000 (hot)
bun run start            # API :3000
bun run build            # API bundle → dist/
bun test                 # API tests (bunfig preload → tests/preload.ts)
bun run test:e2e         # Playwright — config e2e/playwright.config.ts
bun run lint             # biome check src tests drizzle.config.ts web
bun run lint:fix
bun run typecheck        # tsc API + tests only (web/ excluded)
bun run db:generate
bun run db:migrate
bun run db:studio
cd web && bun run dev    # Astro :4321 — needs PUBLIC_API_URL
cd web && bun run build
cd web && bun run start
cd web && bun run typecheck

# Single test
bun test tests/path/to/file.test.ts
bun test --test-name-pattern "items create"  # filter by name

# Deploy (Fly.io)
bun run scripts/run-migrations.ts   # release migration (matches fly.toml release_command)
flyctl deploy
```

## Architecture

**Two packages.** Root = Hono API. `web/` = Astro. No workspace monorepo tool; install deps in each tree.

**Entry:** `src/index.ts` — `Bun.serve` + `mountRoutes()` from `src/routes/index.ts`.

**Middleware order** (after `app.onError(errorHandler)`):

1. `security` — secure headers
2. `httpsRedirect` — production only
3. `requestLogger` — server-generated `requestId` (UUID); optional client `x-request-id` trimmed → `clientRequestId` on context + access log; response `x-request-id` is always the server id
4. `socketIp` — `Bun.serve` `requestIP` → `c.set('socketIp', …)` (not spoofable by clients)
5. Global rate limit (`RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`, `clientIp`)
6. Health-only rate limit — path prefix `/health`
7. `cors(buildCorsConfig(env.ALLOWED_ORIGINS))` — allowlist + `Authorization`; `**credentials: false`** (Bearer JWT only; avoids `Allow-Credentials` until cookie cross-origin auth exists with CSRF).
8. `bodyLimit()`
9. `app.route('/', mountRoutes(auth))` — `/health`, `/items`, …

**Env.** Only `src/env.ts` parses `process.env`; import `env` elsewhere. Never read raw `process.env` in route handlers.

**DB.** `src/db/index.ts` exports `db` and `closeDb`. Driver from `DATABASE_URL` + optional `DATABASE_AUTH_TOKEN`. Migrations under Drizzle’s output path; schema in `src/db/schema.ts`.

**Errors.** Throw `AppError(code, message, status)` from handlers. `onError` maps `AppError`, `ZodError`, and unknowns to the standard JSON envelope.

**Auth.** `requireAuth(auth)` where `auth.verify` is `createClerkVerifier({ secretKey, authorizedParties })`. Context vars: `userId`, `sessionId` (see `src/types/hono.d.ts`).

**Validation.** Use `validate({ json, query, params })`; read `c.get('validated')`. Typed via `ContextVariableMap`.

**Rate limits.**
- `createRateLimit` (`src/middleware/rateLimitFactory.ts`) uses in-process `MemoryStore` (`src/lib/rateLimitStore.ts`) — **not shared across replicas**. Effective budget = `RATE_LIMIT_MAX × replica_count` on horizontal scale.
- Inject shared store via `createRateLimit({ …, store })` implementing `increment(key, windowMs) → Promise<{ count, resetAt }>`. When `store` omitted, `dispose` closes it; custom store = your lifecycle.
- If `increment` throws, logs `msg: ‘rate_limit_store_error’` and **fails open** (request proceeds, no 500).
- `clientIp`: `TRUST_PROXY=false` (default) → keys use `socketIp` from Bun `requestIP` (unspoofable). Set `TRUST_PROXY=true` only behind a trusted reverse proxy forwarding `X-Forwarded-For`.

**Shutdown.** `createShutdownManager()` in `src/index.ts`: register `globalLimiter.dispose`, `healthLimiter.dispose`, `closeDb`, then `attachSignals()`; after `Bun.serve`, register `bunServer.stop()`.

**Tests.** `bunfig.toml` sets `root = "tests"` and preloads `tests/preload.ts` so only `tests/**/*` runs under Bun and `items` tests get a clean SQLite file DB before `src/db` loads. Do not remove without replacing isolation strategy. `tests/preload.ts` overrides `DATABASE_URL` to a throwaway file — overriding it again in env breaks isolation.

**E2E.** `bun run test:e2e` runs `playwright test --config e2e/playwright.config.ts`. Default `baseURL` `http://localhost:4321` or `WEB_URL`. Web dev server must be up; set `web/.env` `PUBLIC_API_URL` to the API.

## Conventions

- **Files:** kebab-case where it fits the repo; **exports:** camelCase; **Astro components:** PascalCase.
- **Routes:** `src/routes/*.ts`, composed in `src/routes/index.ts`.
- **User-facing copy:** English.
- **Types:** strict + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. Path `@/*` → `src/*` (API only).
- **Typecheck scope:** `bun run typecheck` covers API + tests only. `web/` requires separate `cd web && bun run typecheck`.
- **Project files:** `DECISIONS.md`, `BUGS.md`, `CHANGELOG.md`, `TODOS.md` (ticket queue) are living docs — update when relevant. `STATE.md`/`DESIGN.md` not used in this repo.

## Environment variables

Required (see `.env.example`): `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `ALLOWED_ORIGINS`.

Common optional: `PORT`, `NODE_ENV`, `LOG_LEVEL`, `DATABASE_AUTH_TOKEN`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` (see **Rate limits** — in-process only), `RESEND_API_KEY` (required when adding Resend email routes), `TRUST_PROXY` (set `true` only behind trusted reverse proxy).

Web: `PUBLIC_API_URL` in `web/.env` (see `web/.env.example`).