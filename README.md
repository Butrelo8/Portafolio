# Hono Template

Production-ready starter: Hono API (Bun) + Astro 4.16 (Node SSR) + Drizzle/libsql + Clerk + Resend.

## Quick Start

```bash
bun install
cp .env.example .env      # fill Clerk keys, Resend key
bun run db:generate
bun run db:migrate
bun run dev               # API on :3000

cd web && bun install && cp .env.example .env && bun run dev   # Web on :4321
```

## Deploy (Fly.io) — API

This repo’s `Dockerfile` and `fly.toml` target the **root Hono API** (Bun). The `web/` Astro app is not in the image; host it elsewhere (e.g. Netlify, Vercel, or a second Fly app) and point `ALLOWED_ORIGINS` at that URL.

1. Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/) and run `fly auth login`.
2. From the repo root, either run `**fly launch`** (creates an app, can merge into this `fly.toml`) or set `**app**` in `fly.toml` to a unique name, then `fly apps create <name>` if the app does not exist yet.
3. Set **secrets** (required for boot + `release_command` migrations):
  ```bash
   fly secrets set \
     DATABASE_URL="libsql://…" \
     DATABASE_AUTH_TOKEN="…" \
     CLERK_SECRET_KEY="sk_live_…" \
     CLERK_PUBLISHABLE_KEY="pk_live_…" \
     ALLOWED_ORIGINS="https://your-frontend.example"
  ```
   Use a remote **libsql** URL (Turso or similar) for production — `file:` SQLite on the ephemeral root disk will lose data on Machine restart.
4. **Proxy IP:** Behind Fly’s edge, set `TRUST_PROXY=true` if you want rate limits / access logs to use the client IP from `X-Forwarded-For` / `X-Real-IP` (see `src/lib/clientIp.ts`). Set with `fly secrets set TRUST_PROXY=true` (or `[env]` in `fly.toml` for non-secret flags).
5. Deploy:
  ```bash
   fly deploy
  ```
   Each deploy runs `**bun run scripts/run-migrations.ts**` as the Fly `release_command` before new Machines roll out. If migrations fail, the deploy stops.
6. Open the app: `fly open` or `https://<app>.fly.dev`. Health check hits `**GET /health**`.
7. Logs: `fly logs`. Scale: `fly scale count 2` (remember in-memory rate limits are per Machine — see README **Rate limiting**).

Your next step on Fly
Rename app in fly.toml (or run fly launch) so the name is globally unique, then fly secrets set and fly deploy. I did not run docker build here (daemon may be unavailable in this environment); the README documents a local smoke run when Docker is installed.

Optional local image smoke test:

```bash
docker build -t hono-api:local .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=file:/tmp/app.db \
  -e CLERK_SECRET_KEY=test -e CLERK_PUBLISHABLE_KEY=test \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  -e NODE_ENV=production \
  hono-api:local
```

## Commands


| Command               | Purpose                    |
| --------------------- | -------------------------- |
| `bun run dev`         | API with hot reload        |
| `bun run test`        | Unit + integration tests   |
| `bun run test:e2e`    | Playwright E2E             |
| `bun run lint`        | Biome check                |
| `bun run typecheck`   | TS type check              |
| `bun run db:generate` | Generate Drizzle migration |
| `bun run db:migrate`  | Apply migrations           |


## Infrastructure

### Env Validation (`src/env.ts`)

Zod-validated env loader. Fails fast at boot with precise error listing every missing/invalid variable. Add new vars to schema in `src/env.ts` and document in `.env.example`.

### CORS (`src/lib/corsOrigins.ts`, `src/lib/allowedOrigins.ts`)

Env-driven allowlist via `ALLOWED_ORIGINS` (comma-separated). Auto-normalizes www↔apex pairs. Feeds both Hono `cors()` and Clerk `authorizedParties`. `**credentials: false**` — API auth is Bearer JWT (`Authorization`), not cookies; flip to `true` only if you add cookie sessions cross-origin and handle CSRF.

### Auth (`src/middleware/auth.ts`)

Clerk JWT verification via `@clerk/backend`. `requireAuth({ verify })` injects `userId` + `sessionId` into Hono context. Uses `CLERK_SECRET_KEY` and CORS allowlist as `authorizedParties`.

### Error Handling (`src/middleware/error.ts`, `src/lib/errors.ts`)

All errors return `{ error: { code, message, status, details? } }`. Throw `AppError(code, message, status)` from handlers. Unhandled + `ZodError` auto-wrapped. Configure codes in `src/lib/errors.ts`.

### Validation (`src/middleware/validate.ts`)

Zod factory: `validate({ json?, query?, params? })`. Parsed data at `c.get('validated')`. Zod errors auto-return 400 with `details`.

### Rate Limiting (`src/middleware/rateLimitFactory.ts`, `rateLimitHealth.ts`)

In-memory fixed-window per **process** (buckets live in a `Map` — no shared store). Global reads `RATE_LIMIT_MAX` + `RATE_LIMIT_WINDOW_MS`. Health has a stricter per-IP limiter. Cleanup interval `unref()`'d so it will not block shutdown.

**Multi-instance:** Horizontal scale (Railway, Fly.io, k8s replicas) gives each API process its own counters, so clients can send roughly `max × replica_count` requests per window unless you add a shared limiter (Redis, KV, gateway). See `TODOS.md` for a future adapter task.

### Security Headers (`src/middleware/security.ts`)

`hono/secure-headers` with CSP, HSTS, X-Frame-Options=DENY, X-Content-Type-Options=nosniff, strict Referrer-Policy. Tune CSP when adding CDNs/analytics.

### HTTPS Redirect (`src/middleware/https.ts`)

Honors `X-Forwarded-Proto`. Enabled only in production (`NODE_ENV=production`). Toggle in `src/index.ts`.

### Body Limit (`src/middleware/bodyLimit.ts`)

Streaming cap (100KB default). Raises `413 PAYLOAD_TOO_LARGE` before fully buffering. Adjust per-route via `bodyLimit(size)`.

### Structured Logging (`src/middleware/requestLogger.ts`, `src/lib/safeLog.ts`)

JSON logs to stdout, redacts known secret fields. Level via `LOG_LEVEL` env. Request ID propagated via `x-request-id` header.

### Graceful Shutdown (`src/lib/gracefulShutdown.ts`)

Registers SIGTERM/SIGINT handlers. DB connections, rate-limit timers, server disposed in reverse registration order.

### Database (`src/db/index.ts`, `src/db/detect.ts`)

Dual-mode Drizzle: picks libsql (Turso/remote) when URL is `libsql://`, `https://`, or `file:` with auth token; else `bun:sqlite`. Migrations in `src/db/migrations/`; edit `src/db/schema.ts` then run `bun run db:generate`.

### Health (`src/routes/health.ts`)

`GET /health` → `{ status, version, uptimeSeconds, time }`. Version from `package.json`.

### Web ↔ API (`web/src/lib/api.ts`)

`getPublicApiUrl()` reads `PUBLIC_API_URL`. `apiFetch(path, { token })` injects Bearer token. No relay — Astro SSR pages fetch API directly.

## Project Structure

See `docs/superpowers/plans/` for implementation plans.