# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

| Layer      | Choice                                             |
| ---------- | -------------------------------------------------- |
| API        | Hono 4 + Bun, TypeScript strict                    |
| Web        | Astro 4.16, fully static (no adapter)              |
| Data       | GitHub repos by topic, `gray-matter` README parsing |
| Cache      | `TtlCache` in-process, default 10 min              |
| Validation | Zod                                                |
| Tests      | Bun test runner; Playwright E2E                    |
| Lint       | Biome (single config at root, covers `web/` too)   |
| Deploy     | Cloudflare Workers — API + static web              |

No database, no auth provider. `clerkAuthorizedParties`, `RESEND_API_KEY` and `fly.toml` are leftovers
from the `hono-template` origin. Cursor rules live in `.cursor/rules/*.mdc` (ts-web-fullstack preset +
`project-api.mdc`, `stack.mdc`); CLAUDE.md wins on any conflict.

## Commands

```bash
bun run dev              # API :3000 (hot)
bun run build            # bundle → dist/
bun test                 # API tests
bun test tests/lib/cache.test.ts        # single file
bun test -t "cache expires"             # single test by name
bun run test:e2e         # Playwright, config e2e/playwright.config.ts (web dev server must be up)
bun run lint / lint:fix  # biome check src tests scripts web
bun run typecheck        # tsc — src + tests only (web/ excluded)
cd web && bun run dev    # Astro :4321 — needs PUBLIC_API_URL in web/.env
cd web && bun run typecheck   # astro check + tsc
```

CI (`.github/workflows/ci.yml`) = lint → typecheck → `bun test`.

## Architecture

**Two packages, no monorepo tool.** Root = Hono API, `web/` = Astro. Install deps in each tree.

**Entry:** `src/index.ts` — `Bun.serve` + `mountRoutes()` from `src/routes/index.ts`
(`/health`, projects, revalidate).

**Middleware order** (after `app.onError(errorHandler)`):

1. `security` — secure headers
2. `httpsRedirect` — production only
3. `requestLogger` — server-generated `requestId` (UUID); optional client `x-request-id` kept as
   `clientRequestId`; response `x-request-id` is always the server id
4. inline `socketIp` — from `bunServer.requestIP` (not client-spoofable)
5. global rate limit (`RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`, keyed by `clientIp`)
6. `/health`-only rate limit
7. `cors(buildCorsConfig(...))` — allowlist, `credentials: false`
8. `bodyLimit()`
9. `app.route('/', mountRoutes())`

**Env.** Only `src/env.ts` parses `process.env` (Zod). Import `env` everywhere else; never read raw
`process.env` in handlers.

**Data flow.** `GitHubClient` (`src/lib/githubClient.ts`) fetches repos tagged `PORTFOLIO_TOPIC` and
parses README front-matter with `gray-matter`; `projectAggregator` shapes them; results cached in
`TtlCache` (`CACHE_TTL_MS`). `POST /api/revalidate` with `Authorization: Bearer <CRON_SECRET>` busts
the cache — Astro pages are ISR, so a cron ping warms the API before revalidation.

**Errors.** Throw `AppError(code, message, status)` from `src/lib/errors.ts` (not from
`middleware/error`). Never `c.json({ error })` by hand — `onError` maps `AppError`, `ZodError`, and
unknowns into the JSON envelope.

**Validation.** `validate({ json, query, params })`, then read `c.get('validated')`. Typed via
`ContextVariableMap` in `src/types/hono.d.ts`.

**Rate limits.** In-process `MemoryStore` — buckets are per-process, **not shared across replicas**.
With `TRUST_PROXY=false` (default) keys use `socketIp`; set `true` only behind a trusted proxy
setting `X-Forwarded-For`.

**Shutdown.** `createShutdownManager()`: register limiter `dispose`s, `attachSignals()`, then
register `bunServer.stop()` after `Bun.serve`.

**Tests.** `bunfig.toml` sets `root = "tests"` and preloads `tests/preload.ts`, so only `tests/**`
runs under `bun test`.

**Web i18n.** English at `web/src/pages/*`, Spanish mirrored under `web/src/pages/es/*`. Adding a
page means adding both.

## Conventions

- Files kebab-case; exports camelCase, named (no default exports); Astro components PascalCase.
- Routes in `src/routes/*.ts`, composed in `src/routes/index.ts`.
- User-facing copy: English (plus the `es/` mirror).
- TS strict + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`;
  path alias `@/*` → `src/*` (API only).

## Environment

Required: `GITHUB_TOKEN`, `GITHUB_USERNAME`. Optional: `PORT`, `NODE_ENV`, `LOG_LEVEL`,
`PORTFOLIO_TOPIC`, `CACHE_TTL_MS`, `CRON_SECRET`, `ALLOWED_ORIGINS`, `TRUST_PROXY`,
`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` (see `.env.example`). Web: `PUBLIC_API_URL` in `web/.env`.
