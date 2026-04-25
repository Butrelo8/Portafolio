# [CLAUDE.md](http://CLAUDE.md)

Guidance for AI assistants working in this repository.

## Stack


| Layer      | Choice                                                                   |
| ---------- | ------------------------------------------------------------------------ |
| API        | Hono 4 + Bun, TypeScript strict                                          |
| Web        | Astro 4.16, hybrid ISR 600s                                              |
| GitHub API | Github repos with `gray-matter` parsing                                   |
| Cache      | `TtlCache` in-process, default 10min                                      |
| Email      | Resend                                                                   |
| Validation | Zod                                                                      |
| API tests  | Bun test runner                                                          |
| E2E        | Playwright (`e2e/playwright.config.ts`)                                  |
| Lint       | Biome (API root; `web/` is separate)                                     |
| Deploy     | Render (API), Vercel (Web)                                               |


## Commands

```bash
bun run dev              # API :3000 (hot)
bun run start            # API :3000
bun run build            # API bundle → dist/
bun test                 # API tests (bunfig preload → tests/preload.ts)
bun run test:e2e         # Playwright — config e2e/playwright.config.ts
bun run lint             # biome check src tests web
bun run lint:fix
bun run typecheck        # tsc API + tests only (web/ excluded)
cd web && bun run dev    # Astro :4321 — needs PUBLIC_API_URL
cd web && bun run typecheck
cd web && bun run build  # Astro build
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

**GitHub API.** Projects are fetched from GitHub repositories matching `PORTFOLIO_TOPIC`. `GitHubClient` parses `README.md` front-matter using `gray-matter`.

**Cache.** `TtlCache<T>` in `src/lib/cache.ts` provides simple in-process TTL caching. Default TTL is 10 minutes. Revalidation can be triggered via `/api/revalidate` with `CRON_SECRET`.

**Errors.** Throw `AppError(code, message, status)` from handlers. `onError` maps `AppError`, `ZodError`, and unknowns to the standard JSON envelope.

**Validation.** Use `validate({ json, query, params })`; read `c.get('validated')`. Typed via `ContextVariableMap`.

**Rate limits.** By default `createRateLimit` (`src/middleware/rateLimitFactory.ts`) uses in-process `MemoryStore` from `src/lib/rateLimitStore.ts` — buckets are per-process and **not shared across replicas**. `**clientIp`:** with `TRUST_PROXY=false` (default), keys use `socketIp` from Bun `requestIP` (clients cannot spoof). Set `TRUST_PROXY=true` only behind a trusted reverse proxy that sets `X-Forwarded-For`.

**Shutdown.** `createShutdownManager()` in `src/index.ts`: register `globalLimiter.dispose`, `healthLimiter.dispose`, then `attachSignals()`; after `Bun.serve`, register `bunServer.stop()`.

**Tests.** `bunfig.toml` sets `root = "tests"` and preloads `tests/preload.ts` so only `tests/**/`* runs under Bun.

**E2E.** `bun run test:e2e` runs `playwright test --config e2e/playwright.config.ts`. Default `baseURL` `http://localhost:4321` or `WEB_URL`. Web dev server must be up; set `web/.env` `PUBLIC_API_URL` to the API.

## Conventions

- **Files:** kebab-case where it fits the repo; **exports:** camelCase; **Astro components:** PascalCase.
- **Routes:** `src/routes/*.ts`, composed in `src/routes/index.ts`.
- **User-facing copy:** English.
- **Types:** strict + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. Path `@/`* → `src/`* (API only).

## Environment variables

Required (see `.env.example`): `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `ALLOWED_ORIGINS`.

Common optional: `PORT`, `NODE_ENV`, `LOG_LEVEL`, `DATABASE_AUTH_TOKEN`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` (see **Rate limits** — in-process only), `RESEND_API_KEY` (required when adding Resend email routes).

Web: `PUBLIC_API_URL` in `web/.env` (see `web/.env.example`).