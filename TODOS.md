# TODOS

## Current plan (WIP)

_Context pass:_ `CLAUDE.md` ~73 lines — OK. No in-repo MCP. Stale rule + MCP + harness skill list = main leverage; repo text alone ~few hundred tokens if rules tightened.



### ~~Trim harness skills (ECC / agent-sort)~~ **Done (2026-04-23)**

**Outcome:** No in-tree `.claude/skills` / commands / hooks — ECC bundle not vendored here (**Depends on** satisfied: skip in-repo trim; global list is operator concern). Ran agent-sort-style pass → `docs/ecc-harness-skill-trim.md` (STACK, DAILY/LIBRARY for this repo + global checklist).

---

## Database

### ~~Run initial migration~~ **Done (2026-04-23)**

**Outcome:** First migration `src/db/migrations/0000_*.sql` + `meta/` from `bun run db:generate` (drizzle-kit **generate:sqlite** — v0.20 has no plain `generate`). `bun run db:migrate` runs `scripts/run-migrations.ts` (bun-sqlite + libsql, matches `src/db/detect.ts`). `package.json` scripts fixed. Applied to DB from `.env` (`items` + `__drizzle_migrations` present).

---

## Security Advisories (from /cso audit 2026-04-23)


---

### Shared rate limit store (Redis / KV) — future

**What:** Optional backend so counters are shared across API replicas (Redis, Upstash, Cloudflare KV, etc.).
**Why:** `src/middleware/rateLimitFactory.ts` is single-process only; horizontal scale multiplies effective client budget until a shared store or edge limiter exists.
**Solution:** Pluggable store interface; keep in-memory default for single-instance templates.
**Done When:** Adapter + docs; tests for at least one backend or contract tests for interface.
**Effort:** M
**Priority:** P4
**Depends on:** Multi-instance production or compliance need for strict global limits

### Audit CORS credentials:true vs bearer-only auth

**What:** Evaluate whether `credentials: true` is needed given auth is bearer JWT, not cookies.
**Why:** `credentials: true` widens future attack surface if cookie auth is ever added without CSRF protection.
**Context:** `src/lib/corsOrigins.ts:17`. All auth via `Authorization: Bearer` header — cookies unused.
**Solution:** Flip to `credentials: false` unless a use-case for cookie auth exists. Document decision.
**Done When:** Decision documented; either flipped or explicit rationale for keeping it written in CLAUDE.md.
**Effort:** S
**Priority:** P2
**Depends on:** None

### Add minimal CI workflow

**What:** Add `.github/workflows/ci.yml` running lint + tests on push/PR.
**Why:** Template ships with no CI; consumers copy it and have no automated checks.
**Context:** No `.github/` directory exists. Commands: `bun run lint && bun test`.
**Solution:** Create workflow with SHA-pinned `actions/checkout` + `oven-sh/setup-bun`. Run lint, typecheck, tests.
**Done When:** PR + push triggers green CI; actions pinned to SHA (not tag).
**Effort:** S
**Priority:** P2
**Depends on:** None

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

### ~~Make RESEND_API_KEY optional~~ **Done (2026-04-23)**
**Outcome:** `src/env.ts` — optional via preprocess (empty → unset); JSDoc when required. `.env.example`, `CLAUDE.md`, `.cursor/rules/hono-template.mdc`, tests/preload + `tests/env.test.ts` updated.

### ~~Document rate limit is single-process only~~ **Done (2026-04-23)**
**Outcome:** README + `CLAUDE.md` + `.env.example` document in-process `Map` limits and multi-instance caveat. Env vars line in CLAUDE points at **Rate limits** section.

### Align `.cursor/rules/hono-template.mdc` with repo (2026-4-23)
**What:** Rewrite project Cursor rule so stack + API patterns match real code and `CLAUDE.md`.
**Done When:** Rule describes same stack as `CLAUDE.md`; examples cite real symbols only; no stale `errorResponse` / `authMiddleware` unless code adds them.

### ~~Cursor MCP audit (global config)~~ **Done (2026-04-23)**
**Outcome:** `github` MCP removed from `~/.cursor/mcp.json` (overlaps `gh`/Shell; heavy tool schema). **Kept:** context7, sequential-thinking, playwright, code-review-graph — rationale + token notes in `docs/cursor-mcp-audit.md`. **Security:** rotate GitHub PAT if it was ever stored in that file or exposed.