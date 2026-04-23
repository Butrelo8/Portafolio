# TODOS

Track open work and completed items. See `CLAUDE.md` for stack and conventions.

_Context pass:_ `CLAUDE.md` ~73 lines — OK. No in-repo MCP. Stale rule + MCP + harness skill list = main leverage; repo text alone ~few hundred tokens if rules tightened.

---

## Open

### Shared rate limit store (Redis / KV) — future

**What:** Optional backend so counters are shared across API replicas (Redis, Upstash, Cloudflare KV, etc.).
**Why:** `src/middleware/rateLimitFactory.ts` is single-process only; horizontal scale multiplies effective client budget until a shared store or edge limiter exists.
**Solution:** Pluggable store interface; keep in-memory default for single-instance templates.
**Done When:** Adapter + docs; tests for at least one backend or contract tests for interface.
**Effort:** M
**Priority:** P4
**Depends on:** Multi-instance production or compliance need for strict global limits

### Server-side request ID alongside client-supplied one

**What:** Always generate server-side UUID for traces; log client id separately.
**Why:** `x-request-id` from client accepted verbatim — trace correlation spoofable.
**Context:** `src/middleware/requestLogger.ts:28` — `c.req.header('x-request-id') ?? crypto.randomUUID()`.
**Solution:** Always call `crypto.randomUUID()` for `requestId`; log client-supplied as `clientRequestId`.
**Done When:** Server always generates own id; client id logged separately if present; response echoes server id.
**Effort:** S
**Priority:** P3
**Depends on:** None

---

## Completed

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
