# TODOS

## Current plan (WIP)

_Context pass:_ `CLAUDE.md` ~73 lines — OK. No in-repo MCP. Stale rule + MCP + harness skill list = main leverage; repo text alone ~few hundred tokens if rules tightened.



### ~~Trim harness skills (ECC / agent-sort)~~ **Done (2026-04-23)**

**Outcome:** No in-tree `.claude/skills` / commands / hooks — ECC bundle not vendored here (**Depends on** satisfied: skip in-repo trim; global list is operator concern). Ran agent-sort-style pass → `docs/ecc-harness-skill-trim.md` (STACK, DAILY/LIBRARY for this repo + global checklist).

---

## Database

### Run initial migration

**What:** Generate and run the first Drizzle migration
**Why:** Database schema needs to exist before any data can be stored
**Context:** Schema is defined in `src/db/schema.ts`. Run `bun run db:generate` then `bun run db:migrate`
**Solution:** From repo root: `bun run db:generate`, review migration SQL, then `bun run db:migrate`. Confirm `DATABASE_URL` matches target DB.
**Done When:** Migration files exist under `drizzle/` (or project convention); migrate applies cleanly; app starts without DB connection errors.
**Effort:** S
**Priority:** P0
**Depends on:** `DATABASE_URL` configured in `.env`

---

## Security Advisories (from /cso audit 2026-04-23)

### Make RESEND_API_KEY optional

**What:** Remove `RESEND_API_KEY` from required env schema until email routes exist.
**Why:** No email code exists; operators set dummy/fake values in prod, masking a broken dep.
**Context:** `src/env.ts` — `RESEND_API_KEY: z.string().min(1)`. No email send routes in `src/routes/`.
**Solution:** Change to `z.string().optional()` or wrap in a feature flag env var (`ENABLE_EMAIL`).
**Done When:** Server starts without `RESEND_API_KEY`; env schema documents when it is required.
**Effort:** S
**Priority:** P2
**Depends on:** None

### Document rate limit is single-process only

**What:** Add clear note to README / CLAUDE.md that rate limit is in-memory per-process.
**Why:** Multi-instance deploys (Railway, Fly.io horizontal scale) defeat rate limiting silently.
**Context:** `src/middleware/rateLimitFactory.ts` — `Map<string, Bucket>` in-process, no shared store.
**Solution:** Add warning to CLAUDE.md + `.env.example`. Future: add Redis/KV adapter when needed.
**Done When:** Limitation documented; optional future task for Redis adapter created.
**Effort:** S
**Priority:** P2
**Depends on:** None

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

### Align `.cursor/rules/hono-template.mdc` with repo (2026-4-23)
**What:** Rewrite project Cursor rule so stack + API patterns match real code and `CLAUDE.md`.
**Done When:** Rule describes same stack as `CLAUDE.md`; examples cite real symbols only; no stale `errorResponse` / `authMiddleware` unless code adds them.

### ~~Cursor MCP audit (global config)~~ **Done (2026-04-23)**
**Outcome:** `github` MCP removed from `~/.cursor/mcp.json` (overlaps `gh`/Shell; heavy tool schema). **Kept:** context7, sequential-thinking, playwright, code-review-graph — rationale + token notes in `docs/cursor-mcp-audit.md`. **Security:** rotate GitHub PAT if it was ever stored in that file or exposed.