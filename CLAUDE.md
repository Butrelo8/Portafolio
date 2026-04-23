# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **API:** Hono 4.0 + Bun (TS 5.0 strict)
- **Web:** Astro 4.16 + Node SSR
- **DB:** Drizzle 0.30 + libsql 0.17 (falls back to `bun:sqlite`)
- **Auth:** @clerk/backend 3.2, @clerk/astro 3.0
- **Email:** Resend 4.0
- **Validation:** Zod 3.23
- **Lint/Format:** Biome 2.4. **Test:** Bun + Playwright

## Commands

```bash
bun run dev            # API hot reload on :3000
bun run test           # Unit + integration
bun run test:e2e       # Playwright
bun run lint           # Biome check
bun run lint:fix       # Biome autofix
bun run typecheck      # tsc --noEmit
bun run db:generate    # New Drizzle migration
bun run db:migrate     # Apply migrations
bun run db:studio      # Drizzle Studio
cd web && bun run dev  # Astro on :4321
```

## Architecture

**Two-runtime split.** `src/` is the Hono API on Bun. `web/` is Astro SSR on Node. They are independent packages; the web app calls the API via `apiFetch()` in `web/src/lib/api.ts`.

**Middleware chain** (applied in `src/index.ts` — order matters):
1. `errorHandler` (via `app.onError`) — catches `AppError` + `ZodError` + unknowns; returns `{error:{code,message,status}}`.
2. `security` — secureHeaders (CSP/HSTS/XFO).
3. `httpsRedirect` — production only, honors `X-Forwarded-Proto`.
4. `requestLogger` — structured JSON logs, sets `x-request-id`.
5. Global `rateLimitFactory` — fixed-window per-IP, env-configurable.
6. `rateLimitHealth` — stricter per-IP cap on `/health`.
7. `cors` — origin function built from `ALLOWED_ORIGINS` (www/apex normalized).
8. `bodyLimit` — 100KB streaming cap.
9. Routes (mounted via `mountRoutes()`); protected routes use `requireAuth` + `validate`.

**Env.** `src/env.ts` is the only place to read `process.env`. Imports elsewhere use the exported `env` object. Zod validation fails fast at boot.

**DB.** `src/db/detect.ts` picks `libsql` vs `bun-sqlite` from `DATABASE_URL` (+ optional `DATABASE_AUTH_TOKEN`). `src/db/index.ts` exports `db` + `closeDb`. Schema in `src/db/schema.ts`.

**Errors.** Always throw `AppError(code, message, status)` from handlers. Never `c.json({error:...}, 500)` directly. Zod validation errors are auto-wrapped.

**Auth.** `requireAuth({ verify })` from `src/middleware/auth.ts`. `createClerkVerifier()` in the same file is the production implementation. Tests pass in a fake verifier.

**Validation.** Always use `validate({ json, query, params })` — never parse inline in handlers. Parsed data is at `c.get('validated')`.

**Graceful shutdown.** Register teardown via the manager in `src/lib/gracefulShutdown.ts`. DB close + rate-limit `dispose()` + `Bun.serve` `stop()` are all registered in `src/index.ts`.

## Conventions

- **Files:** kebab-case. **Exports:** camelCase. **Components:** PascalCase.
- **Routes:** one file per domain under `src/routes/`, mounted in `src/routes/index.ts`.
- **No shared types package yet** — duplicate types between `src/` and `web/` when needed; consolidate only when duplication hurts.
- **All user-facing strings in English.**

## Environment Variables

Required: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `ALLOWED_ORIGINS`, `RESEND_API_KEY`.
Optional: `DATABASE_AUTH_TOKEN`, `PORT` (3000), `NODE_ENV` (development), `LOG_LEVEL` (info), `RATE_LIMIT_MAX` (60), `RATE_LIMIT_WINDOW_MS` (60000).

See `.env.example` for full list.

## TypeScript

Strict mode + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `noImplicitOverride`. Path alias `@/*` → `src/*`. Hono context augmented in `src/types/hono.d.ts`.
