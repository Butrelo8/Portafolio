# [CLAUDE.md](http://CLAUDE.md)

Guidance for AI assistants working in this repository.

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
cd web && bun run typecheck
```

## Architecture

**Two packages.** Root = Hono API. `web/` = Astro. No workspace monorepo tool; install deps in each tree.

**Entry:** `src/index.ts` — `Bun.serve` + `mountRoutes()` from `src/routes/index.ts`.

**Middleware order** (after `app.onError(errorHandler)`):

1. `security` — secure headers
2. `httpsRedirect` — production only
3. `requestLogger` — request id + JSON access log
4. Global rate limit (`RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`, `clientIp`)
5. Health-only rate limit — path prefix `/health`
6. `cors(buildCorsConfig(env.ALLOWED_ORIGINS))`
7. `bodyLimit()`
8. `app.route('/', mountRoutes(auth))` — `/health`, `/items`, …

**Env.** Only `src/env.ts` parses `process.env`; import `env` elsewhere. Never read raw `process.env` in route handlers.

**DB.** `src/db/index.ts` exports `db` and `closeDb`. Driver from `DATABASE_URL` + optional `DATABASE_AUTH_TOKEN`. Migrations under Drizzle’s output path; schema in `src/db/schema.ts`.

**Errors.** Throw `AppError(code, message, status)` from handlers. `onError` maps `AppError`, `ZodError`, and unknowns to the standard JSON envelope.

**Auth.** `requireAuth(auth)` where `auth.verify` is `createClerkVerifier({ secretKey, authorizedParties })`. Context vars: `userId`, `sessionId` (see `src/types/hono.d.ts`).

**Validation.** Use `validate({ json, query, params })`; read `c.get('validated')`. Typed via `ContextVariableMap`.

**Rate limits.** `createRateLimit` (`src/middleware/rateLimitFactory.ts`) stores buckets in a process-local `Map`. Limits are **not shared across instances**: with horizontal scale (Fly.io, Railway, k8s replicas), each process applies its own counter, so a client’s effective budget is roughly `max × replica_count` unless you add a shared store (Redis, KV, edge gateway). Single-instance deploys behave as intended.

**Shutdown.** `createShutdownManager()` in `src/index.ts`: register `globalLimiter.dispose`, `healthLimiter.dispose`, `closeDb`, then `attachSignals()`; after `Bun.serve`, register `server.stop()`.

**Tests.** `bunfig.toml` sets `root = "tests"` and preloads `tests/preload.ts` so only `tests/**/`* runs under Bun and `items` tests get a clean SQLite file DB before `src/db` loads. Do not remove without replacing isolation strategy.

**E2E.** `bun run test:e2e` runs `playwright test --config e2e/playwright.config.ts`. Default `baseURL` `http://localhost:4321` or `WEB_URL`. Web dev server must be up; set `web/.env` `PUBLIC_API_URL` to the API.

## Conventions

- **Files:** kebab-case where it fits the repo; **exports:** camelCase; **Astro components:** PascalCase.
- **Routes:** `src/routes/*.ts`, composed in `src/routes/index.ts`.
- **User-facing copy:** English.
- **Types:** strict + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. Path `@/`* → `src/*` (API only).

## Environment variables

Required (see `.env.example`): `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `ALLOWED_ORIGINS`.

Common optional: `PORT`, `NODE_ENV`, `LOG_LEVEL`, `DATABASE_AUTH_TOKEN`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` (see **Rate limits** — in-process only), `RESEND_API_KEY` (required when adding Resend email routes).

Web: `PUBLIC_API_URL` in `web/.env` (see `web/.env.example`).
