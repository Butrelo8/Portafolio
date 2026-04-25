# DECISIONS

Architectural decisions and their rationale.
Updated automatically by the AI agent when decisions are made.

---

## 2026-04-24 — Cursor rules: global profile + repo-local remainder

**Context:** Daily implementation runs in Cursor; generic rules duplicated per repo and mixed with Hono-template specifics.
**Decision:** Ship generic rules under `~/.cursor/rules/` (16 `.mdc` files: placeholders in `stack.mdc`, new `error-handling-patterns.mdc`, English `prompt-templates.mdc`, trimmed/testing/tdd/mcp genericization). This repo keeps only `.cursor/rules/hono-template.mdc` and `.cursor/rules/stack.mdc` with concrete stack and paths.
**Alternatives considered:** Symlink into `~/.claude/`; keep full rules only in repo.
**Why not the others:** Cursor loads user-level rules for every workspace; Claude Code docs stay separate; repo rules stay minimal and stack-specific.

## YYYY-MM-DD — Initial stack selection

**Context:** Starting a new micro SaaS project as a solo developer
**Decision:** Hono + Bun + PostgreSQL + Drizzle + Clerk + Stripe
**Alternatives considered:** Express + Node, Fastify + Node
**Why not the others:**

- Express: not TypeScript-native, slower, more boilerplate
- Fastify: more config overhead, less edge-ready than Hono
- Node: Bun is faster, TypeScript-native, simpler DX

---

