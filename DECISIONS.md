# DECISIONS

Architectural decisions and their rationale.
Updated automatically by the AI agent when decisions are made.

---

## 2026-09-07 — Spanish is the default language

**Context:** The site opened in English with Spanish behind a toggle. Every client so far is in Veracruz or Xalapa, and the audience decision above targets local freelance clients.
**Decision:** Spanish serves from `/`, English from `/en/`. Legacy `/es/*` URLs redirect to the root.
**Alternatives considered:** Keep English default; detect browser language and redirect.
**Why not the others:** English-first makes the most likely visitor do work before reading anything. Language detection breaks static hosting's simplicity and fights the visitor who deliberately picked a language.

## 2026-09-07 — Audience: freelance clients, not employers or OSS peers

**Context:** The site had no stated audience, so project selection was accidental — whatever happened to carry the `portfolio` topic. That surfaced a forked template and the portfolio itself while real shipped work stayed invisible.
**Decision:** The portfolio targets **prospective freelance clients**. Every content decision resolves in favor of "would a business owner deciding whether to hire Ivan care about this?"
**Alternatives considered:** Employers/recruiters; OSS peers; an unweighted mix.
**Why not the others:** A mix produces a flat grid that serves nobody. Employer-focus would foreground code quality and breadth; OSS-focus would foreground tooling. Both bury the four pieces of paid/shipped work that actually close freelance deals.

## 2026-09-07 — Project content lives in local markdown, not GitHub metadata

**Context:** `web/src/lib/projects.ts` builds the site from public repos tagged `portfolio`. Two of the four real projects are **private** repos (`coastcompetition`, `carwash-omaverick`), and `Inv.-Lite-A`'s selling point — running in production at a real company — exists nowhere in GitHub metadata.
**Decision:** Move to an Astro content collection: one markdown case study per project under `web/src/content/projects/`, EN + ES. Delete the GitHub fetch, `PORTFOLIO_GITHUB_TOKEN`, and the topic convention.
**Alternatives considered:** Enrich README front-matter and keep the fetch; a hybrid (local case studies + a GitHub-fed OSS strip).
**Why not the others:** README front-matter cannot describe private work at all — it structurally excludes the two strongest pieces. It also puts client-facing prose in a file edited for a different audience. The hybrid keeps a token, a secret, and a network dependency alive to render one small strip that a hand-written list covers.
**Consequence:** This reverses part of the same-day API collapse. The build-time fetch was the right answer for a repo-driven site; the audience decision changed what the site is. Case studies are hand-written, so they go stale unless edited deliberately — accepted, because client-facing copy should never auto-update.

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

