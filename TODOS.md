# TODOS

Track open work and completed items. See `CLAUDE.md` for stack and conventions.

_Context pass:_ `CLAUDE.md` ~73 lines — OK. No in-repo MCP. Stale rule + MCP + harness skill list = main leverage; repo text alone ~few hundred tokens if rules tightened.

---

## Open


### Rewrite about bio — EN + ES (P1)

- **What:** Replace placeholder bio in `web/src/content/about/en.md` and `web/src/content/about/es.md` with authentic, personal content reflecting Ivan's actual identity, voice, and stack.
- **Why:** Current copy is generic subagent-generated placeholder. Doesn't reflect real personality, design aesthetic (neo-brutalism, #ff4500, JetBrains Mono), or actual focus areas.
- **Context:** Ivan (Trelo), full-stack developer, México (UTC-6), email `av.ivan.8@gmail.com`, GitHub `Butrelo8`. Builds opinionated APIs + frontends with TypeScript, Hono 4, Bun, Astro. Deploys to Render + Vercel. Cares about design quality (neo-brutalism, no generic templates). Heavy Claude Code user with custom tooling (engram, Cursor rules, superpowers). Accurate stack: Hono, Bun, TypeScript strict, Astro, Biome, Playwright, Zod.
- **Solution:** Rewrite both files. EN first, ES translation second (same voice, not literal). Keep contact block (`av.ivan.8@gmail.com`, `Butrelo8`). Keep `## What I work with` section or equivalent. Add personality — direct, technical, no corpo filler. No "passionate developer" or "love solving problems".
- **Done When:** Both files sound like Ivan wrote them, not a template. Stack list accurate to current repo. EN + ES committed and pushed.
- **Effort:** S (human: ~30m / CC: ~5 min)
- **Priority:** P1
- **Depends on:** Nothing.

### Proposal generator page — /tools/proposal (P2)

- **What:** Add freelance proposal generator as new page in Astro web app. 3-step form: (1) client + project brief, (2) deliverables + economics, (3) dev info + tone/language. Streams Claude-generated markdown proposal.
- **Why:** Useful standalone tool for Ivan's freelance work. Lives on portfolio site as real product demo.
- **Context:** Full React component already designed (dark theme, IBM Plex Mono, gold `#B8973A` accent — MafiaTumbadaOfi branding). Original code calls `api.anthropic.com` directly from browser — **must proxy through Hono** (`POST /tools/proposal`) to avoid exposing API key client-side.
- **Solution:**
  1. Add `POST /tools/proposal` route in `src/routes/` — accepts `{ system, messages }`, streams Claude response. Add `ANTHROPIC_API_KEY` to `src/env.ts` + `.env.example`.
  2. Add `ProposalGenerator.tsx` to `web/src/components/` — port existing component, replace direct `api.anthropic.com` fetch with proxy call to `/tools/proposal`.
  3. Add `web/src/pages/tools/proposal.astro` — `<ProposalGenerator client:load />`. Ensure `@astrojs/react` in `web/`.
  4. Decide: keep gold `#B8973A` as tool-specific theme or swap to `#ff4500` to match portfolio neo-brutalism.
- **Done When:** `/tools/proposal` renders 3-step form, streams proposal, copy-markdown works. API key never client-exposed. Deployed on Vercel.
- **Effort:** M (human: ~2h / CC: ~30 min)
- **Priority:** P2
- **Depends on:** `ANTHROPIC_API_KEY` on Render. `@astrojs/react` in web deps.

### Redis RateLimitStore adapter (P4)

- **What:** `RedisRateLimitStore` class in `src/lib/rateLimitStore.ts` implementing `RateLimitStore` interface. Uses `@upstash/redis` (HTTP-based, no persistent connection). Atomic `INCR` + `EXPIREAT` via pipeline. `REDIS_URL` optional env var — absent = MemoryStore fallback. Both `globalLimiter` and `healthLimiter` share same store instance. Store errors already fail-open in `rateLimitFactory.ts` (`msg: 'rate_limit_store_error'`).
- **Why:** In-process `MemoryStore` gives each replica its own budget. 2 replicas = 2× allowed budget per IP. Redis fixes this — all replicas share one counter per key.
- **Effort:** M (human: ~1 day / CC: ~15 min). **Priority: P4.**
- **Notes:** ms→s conversion for `EXPIREAT` (`Math.ceil(resetAt / 1000)`). Add `REDIS_URL` to `.env.example` + `safeLog.ts` SECRET_KEYS. Tests: Redis contract + fail-open + MemoryStore fallback when `REDIS_URL` absent. Plan at ~/Cursor Projects/Hono Template/docs/superpowers/plans/2026-04-23-redis-rate-limit-adapter.md

### Clerk org support — orgId on context (P4)

- **What:** Extract `orgId` from Clerk JWT claims in `requireAuth`. Add to `ContextVariableMap`. Items queries optionally scope by `orgId` when present.
- **Why:** Foundation for org-scoped SaaS. Clerk already returns `orgId` in JWT — just not extracted. Every multi-tenant user implements this from scratch today.
- **Effort:** M (human: ~1 day / CC: ~20 min). **Priority: P2.**
- **Notes:** Items table may need `org_id` column + Drizzle migration. Verify Clerk JWT claim field name. Design before implementing.

### Resend email route — POST /email/send (P4)

- **What:** `src/routes/email.ts` with `POST /email/send`, Zod validation, `requireAuth`, Resend SDK call. `RESEND_API_KEY` already stubbed in `src/env.ts`.
- **Why:** Completes auth + CRUD + email primitives. Env var stub confuses cloners.
- **Effort:** S (human: ~4h / CC: ~10 min). **Priority: P3.**
- **Notes:** Test suite needs Resend SDK mock.

## Completed

### Sanitize README markdown rendering — XSS fix (2026-04-28)

- **Outcome:** Removed `set:html={project.readmeMarkdown}` XSS risk in Spanish project pages. READMEs are now parsed by `marked` and sanitized with `sanitize-html` in `src/lib/projectAggregator.ts`.
- **Changes:** Field renamed `readmeMarkdown` → `readmeHtml` in API and web types. English page unaffected (no render); Spanish page updated to use sanitized HTML. Sanitization pipeline added to `projectAggregator`.


### Fly.io deploy config — fly.toml + Dockerfile (2026-04-25)

- **Outcome:** `Dockerfile` — multi-stage `oven/bun:1.3`: builder `bun install --frozen-lockfile` + `bun build src/index.ts --outdir dist --target bun`; runtime production deps + `dist/`, `src/` (migrations), `scripts/`, non-root user, `CMD ["bun","dist/index.js"]`. `fly.toml` — `http_service` on 3000, `GET /health` check, `release_command` = `bun run scripts/run-migrations.ts`, `[[vm]]` 512mb / 1 CPU. `.dockerignore` adds `web/` + `e2e/`. README **Deploy (Fly.io) — API** — flyctl, secrets, libsql note, `TRUST_PROXY`, deploy, logs/scale, optional `docker build` smoke. **Tests:** `tests/flyDeployArtifacts.test.ts` — root `Dockerfile`/`fly.toml` exist; key strings for port, health path, build/run.
- **Note:** Rename `app` in `fly.toml` or use `fly launch` before first deploy.

### Log clientIp in request access log (2026-04-25)

- **Outcome:** `src/lib/clientIp.ts` — `resolveClientIp` + `clientIp` (reads `env.TRUST_PROXY`). `requestLogger` adds `clientIp` to `msg: request` JSON after `await next()` via `resolveClientIp(c, env.TRUST_PROXY)` (always present; `unknown` if `socketIp` unset). `rateLimitFactory.ts` re-exports `clientIp` / `resolveClientIp` from lib (no circular import with `requestLogger`).
- **Tests:** `tests/clientIp.test.ts` — trust off ignores spoofed `X-Forwarded-For`; trust on uses first forwarded hop + `x-real-ip` fallback. `tests/requestLogger.test.ts` — `unknown` without `socketIp`; `192.0.2.10` when prior middleware sets `socketIp`. `tests/rateLimit.test.ts` imports `resolveClientIp` from `src/lib/clientIp`.
- **Cleanup:** Removed duplicate "Log clientIp in request access log" from Open. Adjusted prior "Fix clientIp spoofing" completed entry to note `resolveClientIp` / `clientIp` now live in `src/lib/clientIp.ts` (since 2026-04-25), not only in `rateLimitFactory.ts`.

### Fail-open wrapper for rate limit store (2026-04-24)

- **Outcome:** `createRateLimit` middleware wraps `store.increment` in try/catch. On throw: `logger.warn({ msg: 'rate_limit_store_error', err, storeType })` (`storeType` = `store.constructor.name` fallback `unknown`), then `await next()` — no 500.
- **Tests:** `tests/rateLimit.test.ts` — `FailingStore` throws; burst stays 200; console JSON lines assert `err` + `storeType`.

### Structured traceId propagation (2026-04-24)

- **Outcome:** `requestLogger.ts` sets `c.set('traceId', requestId)` (same UUID as `requestId`; no second `randomUUID`). `ContextVariableMap` has `traceId` in `src/types/hono.d.ts`. Access log (`msg: request`) and `errorHandler` logs use field `traceId`. `error.ts` resolves via `c.get('traceId') ?? c.get('requestId')`.
- **Tests:** `tests/requestLogger.test.ts` — `traceId` on context + access log JSON; `tests/errors.test.ts` — unhandled error log line matches `x-request-id`.

### Full CRUD tests + owner isolation for /items (2026-04-23)

- **Outcome:** `tests/items.test.ts` — `buildItemsApp`, `fakeAuth` / `fakeAuthU2` (`good` / `good2`). Covers POST create, GET/PATCH/DELETE 404 unknown id, POST empty name → 400, PATCH/DELETE happy path, owner isolation on GET/PATCH/DELETE (u2 → 404; delete case confirms u1 still has row).

### GET /items pagination + `items_owner_id_idx` (2026-04-23)

- **Outcome:** `?limit` (1–200, default 50) and optional `?cursor` (item UUID) on `GET /items`; Zod via `validate({ query: listQuery })`; response `{ items, nextCursor }` with `limit+1` fetch and `orderBy(asc(items.id))`. Index `items_owner_id_idx` on `owner_id` in `src/db/schema.ts`; migration `0001_sticky_madelyne_pryor.sql`.
- **Tests:** `tests/items.test.ts` asserts `nextCursor`; `paginates with limit and cursor`. `tests/preload.ts` creates the same index on the test file DB.

### Fix clientIp spoofing — TRUST_PROXY + socket IP (2026-04-23)

- **Outcome:** `TRUST_PROXY` in `src/env.ts` (default `false`, safe string/boolean parsing). `resolveClientIp` / `clientIp` live in `src/lib/clientIp.ts` (since 2026-04-25, moved from `rateLimitFactory.ts`) — use `c.get('socketIp')` unless proxy trust is on. `src/index.ts` sets `socketIp` via `bunServer.requestIP` before global rate limit. `ContextVariableMap.socketIp`, `.env.example`, `tests/rateLimit.test.ts` (spoofed `X-Forwarded-For` same bucket when `resolveClientIp(..., false)`).
- **Docs:** `CLAUDE.md` middleware order + rate limit note.

### Pluggable rate limit store — interface + MemoryStore (2026-04-23)

- **Outcome:** `RateLimitStore` + `MemoryStore` in `src/lib/rateLimitStore.ts`; `createRateLimit({ …, store })` for shared backends; default remains in-process per replica.
- **Middleware:** `src/middleware/rateLimitFactory.ts` delegates to `increment(key, windowMs)`; `dispose` calls `store.close()` only when the limiter created the store.
- **Tests:** `tests/rateLimitStore.test.ts` — contract suite + Hono integration with injected store.
- **Docs:** `CLAUDE.md` **Rate limits**; plan `docs/superpowers/plans/2026-04-23-rate-limit-store.md`.
- **Still optional later:** Concrete Redis / Upstash / KV adapter when strict global limits matter.

### Server-side request ID (2026-04-23)

- **Outcome:** `requestLogger` always sets `requestId = crypto.randomUUID()`; response header `x-request-id` is the server id only.
- **Client correlation:** Non-empty client `x-request-id` is trimmed, stored as `c.set('clientRequestId', …)`, and included in the access log as `clientRequestId` (not used as canonical trace id).
- **Types:** `ContextVariableMap.clientRequestId` optional in `src/types/hono.d.ts`.
- **Tests:** `tests/requestLogger.test.ts`.

### Add minimal CI workflow (2026-04-23)

- **Outcome:** `.github/workflows/ci.yml` runs on `push` / `pull_request` to `main` and `master`: `bun install --frozen-lockfile`, `bun run lint`, `bun run typecheck`, `bun test` (unit/integration only; no Playwright).
- **Actions:** SHA-pinned `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683` (v4.2.2) and `oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6` (v2.2.0); Bun `1.3` via `setup-bun`.
- **Concurrency:** Same-branch runs cancel superseded jobs.

### Trim harness skills (ECC / agent-sort) (2026-04-23)

- **Outcome:** No in-tree `.claude/skills` / commands / hooks — ECC bundle not vendored here (**Depends on** satisfied: skip in-repo trim; global list is operator concern).
- **Docs:** Agent-sort-style pass recorded in `docs/ecc-harness-skill-trim.md` (STACK, DAILY/LIBRARY for this repo + global checklist).

### Run initial Drizzle migration (2026-04-23)

- **Outcome:** First migration `src/db/migrations/0000_*.sql` + `meta/` from `bun run db:generate` (drizzle-kit **generate:sqlite** — v0.20 has no plain `generate`).
- **Tooling:** `bun run db:migrate` runs `scripts/run-migrations.ts` (bun-sqlite + libsql, matches `src/db/detect.ts`); `package.json` scripts aligned.
- **Verify:** Applied to DB from `.env` — `items` + `__drizzle_migrations` present.

### Audit CORS `credentials` vs bearer-only auth (2026-04-23)

- **Outcome:** `buildCorsConfig` sets `credentials: false` (was `true`); Bearer JWT via `Authorization` only; `web/src/lib/api.ts` does not use credentialed fetch.
- **Code:** JSDoc on `src/lib/corsOrigins.ts`; `tests/origins.test.ts` asserts `credentials === false`.
- **Docs:** `CLAUDE.md` middleware order + README CORS subsection.

### Make `RESEND_API_KEY` optional (2026-04-23)

- **Outcome:** `src/env.ts` — optional via preprocess (empty → unset); JSDoc when required for email routes.
- **Docs / config:** `.env.example`, `CLAUDE.md`, `.cursor/rules/hono-template.mdc`.
- **Tests:** `tests/preload.ts`, `tests/env.test.ts` updated.

### Document rate limit is single-process only (2026-04-23)

- **Outcome:** README + `CLAUDE.md` + `.env.example` document in-process `Map` limits and multi-instance caveat.
- **Docs:** Env vars line in `CLAUDE.md` points at **Rate limits** section; `.cursor/rules/hono-template.mdc` optional-vars note.

### Align `.cursor/rules/hono-template.mdc` with repo (2026-04-23)

- **Outcome:** Rule describes same stack as `CLAUDE.md`; examples cite real symbols (`AppError`, `requireAuth`, `validate`, routes, sqlite/libsql).
- **Done when met:** No stale `errorResponse` / `authMiddleware` unless code adds them.

### Cursor MCP audit — global config (2026-04-23)

- **Outcome:** `github` MCP removed from `~/.cursor/mcp.json` (overlaps `gh`/Shell; heavy tool schema).
- **Kept:** context7, sequential-thinking, playwright, code-review-graph — rationale + token notes in `docs/cursor-mcp-audit.md`.
- **Security:** Rotate GitHub PAT if it was ever stored in that file or exposed.

---
