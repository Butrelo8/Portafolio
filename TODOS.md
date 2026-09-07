# TODOS

Track open work and completed items. See `CLAUDE.md` for stack and conventions.

_Context pass:_ `CLAUDE.md` ~73 lines — OK. No in-repo MCP. Stale rule + MCP + harness skill list = main leverage; repo text alone ~few hundred tokens if rules tightened.

---

## Open


### Rewrite about bio — EN + ES (P1)

- **What:** Replace placeholder bio in `web/src/content/about/en.md` and `web/src/content/about/es.md` with authentic, personal content reflecting Ivan's actual identity, voice, and stack.
- **Why:** Current copy is generic subagent-generated placeholder. Doesn't reflect real personality, design aesthetic (neo-brutalism, #ff4500, JetBrains Mono), or actual focus areas.
- **Context:** Ivan (Trelo), full-stack developer, México (UTC-6), email `av.ivan.8@gmail.com`, GitHub `Butrelo8`. Builds opinionated frontends and APIs with TypeScript, Bun, Astro, Hono. Deploys to Cloudflare Workers. Cares about design quality (neo-brutalism, no generic templates). Heavy Claude Code user with custom tooling (engram, Cursor rules, superpowers). Accurate stack for *this* site: Astro (static), TypeScript strict, Biome, Cloudflare Workers. Hono/Bun/Zod are real skills but no longer in this repo — see README History.
- **Solution:** Rewrite both files. EN first, ES translation second (same voice, not literal). Keep contact block (`av.ivan.8@gmail.com`, `Butrelo8`). Keep `## What I work with` section or equivalent. Add personality — direct, technical, no corpo filler. No "passionate developer" or "love solving problems".
- **Done When:** Both files sound like Ivan wrote them, not a template. Stack list accurate to current repo. EN + ES committed and pushed.
- **Effort:** S (human: ~30m / CC: ~5 min)
- **Priority:** P1
- **Depends on:** Nothing.

### Proposal generator page — /tools/proposal (P2)

- **What:** Freelance proposal generator as a page on the site. 3-step form: (1) client + project brief, (2) deliverables + economics, (3) dev info + tone/language. Streams a Claude-generated markdown proposal.
- **Why:** Useful tool for Ivan's freelance work, and a real product demo on the portfolio rather than a screenshot.
- **Blocker — needs a runtime.** The site is `output: 'static'` with no server; this is the one feature that justifies bringing a Worker back. `ANTHROPIC_API_KEY` must never reach the browser, and streaming needs a server. Never call `api.anthropic.com` from client JS.
- **Solution:**
  1. New Worker with its own `wrangler.jsonc`, deployed separately — do NOT resurrect the deleted Hono app wholesale. One route: `POST /proposal`, accepts `{ system, messages }`, streams the Claude response. Key as a Cloudflare secret, not a var. Lock CORS to the site origin.
  2. Keep the site static and make this page a client island that fetches the Worker — lighter than switching the whole site to `output: 'server'`.
  3. `web/src/components/ProposalGenerator.tsx` — port the existing React component (dark theme, IBM Plex Mono, gold `#B8973A`). Needs `@astrojs/react` in `web/`.
  4. `web/src/pages/tools/proposal.astro` — `<ProposalGenerator client:load />`.
  5. Decide: keep gold `#B8973A` as a tool-specific theme, or swap to `#ff4500` to match the portfolio.
- **Done When:** `/tools/proposal` renders the 3-step form, streams a proposal, copy-markdown works. Key never client-exposed. Deployed.
- **Effort:** M (human: ~3h / CC: ~45 min)
- **Priority:** P2
- **Depends on:** Anthropic API key. A decision on island vs `output: 'server'`.

## Completed

### Collapse the API into the build (2026-09-07)

- **Outcome:** Deleted the Hono API. The site is `output: 'static'`, so the deployed Worker only ever served our own CI — never a visitor. The GitHub fetch + README rendering now live in `web/src/lib/projects.ts`, memoized so one build makes one pass over the GitHub API.
- **Changes:** Removed `src/`, `tests/`, `e2e/`, `wrangler.jsonc`, `Dockerfile`, `fly.toml`, `bunfig.toml`, root `tsconfig.json` (-2479 lines). Root `package.json` is now Biome + script delegation to `web/`. CI lints/typechecks the site; `deploy-web.yml` takes `PORTFOLIO_GITHUB_TOKEN` / `PORTFOLIO_GITHUB_USERNAME` instead of `PUBLIC_API_URL` — GitHub reserves the `GITHUB_` prefix for both secrets and variables. Biome skips `*.astro` and generated `web/.astro/`.
- **Also fixed:** CI deploy had never once succeeded. `CLOUDFLARE_API_TOKEN` held an R2-only token, which authenticated fine but had no permission on `workers/services` — surfacing only as an opaque `Authentication error [code: 10000]`. Replaced with a Workers-scoped token.
- **Dropped as moot:** Redis rate-limit adapter, Clerk org support, Resend email route — all API-only.

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
