# ECC / harness skill trim (agent-sort outcome)

**Repo:** hono-template  
**Method:** Evidence from tree + `package.json` (agent-sort workflow, no subagents).  
**Date:** 2026-04-23

## STACK

- **Runtime:** Bun (`package.json` scripts: `bun run`, `bun test`).
- **API:** Hono 4 + TypeScript (`hono`, `src/**/*.ts` — ~21 TS modules under `src/`).
- **Data:** Drizzle + SQLite / libsql (`drizzle-orm`, `src/db/`).
- **Auth:** Clerk (`@clerk/backend`).
- **Validation:** Zod (`zod`, `src/middleware/validate.ts`).
- **Quality:** Biome (`@biomejs/biome`), TypeScript 5.
- **E2E:** Playwright (`@playwright/test`, `e2e/`).
- **Frontend:** Astro subapp (`web/`).
- **Not present:** Python (no `*.py`), JVM stacks, Prisma client in app code, etc.

## In-repo surfaces (only harness-adjacent assets here)


| Path                                 | Type   | Bucket    | Evidence                                                                       |
| ------------------------------------ | ------ | --------- | ------------------------------------------------------------------------------ |
| `.cursor/rules/hono-template.mdc`    | rule   | **DAILY** | `alwaysApply: true`; encodes stack + errors + auth + routes aligned to `src/`. |
| `.cursor/rules/hono-template-ts.mdc` | rule   | **DAILY** | `globs: "**/*.ts"`; TS-only hints — already scoped (not global session noise). |
| `CLAUDE.md`                          | doc    | **DAILY** | Short project index; keep as single entrypoint for agents.                     |
| `.claude/settings.local.json`        | config | **DAILY** | Permissions only; no skill bundle.                                             |


**Finding:** There is **no** in-repository `.claude/skills/`, `.claude/commands/`, `.claude/hooks/`, or `agents/`*. Nothing to “move to LIBRARY” **inside this repo** — you are **not** using an ECC file bundle checked into the tree.

## LIBRARY (global / user-level — not installed here)

For sessions opened **on this repo** with a fat global skill list (e.g. `~/.claude/skills` with many stacks), treat as **LIBRARY** (search-on-demand, not mental default):

- Django / Laravel / Spring / Flutter / Rust / Go **patterns** skills — **no** matching source layout in this repo.
- `gstack/`*, `design-html`, enterprise ops — **LIBRARY** unless you actively use them on this project.
- **Keep installed** but do not assume they load every turn; use explicit `@skill` or router when needed.

This matches agent-sort rule: *LIBRARY does not mean delete — means not loaded by default.*

## INSTALL PLAN (for this repo)

1. **Do not** add a full `.claude/skills/` copy into the repo unless the team standardizes on ECC-in-tree; it increases noise for contributors who use Cursor-only rules.
2. **Optional:** If one day you vendor ECC here, run **agent-sort** again against real `skills/`* paths and split DAILY vs LIBRARY with grep evidence from `src/`.
3. **Optional:** Add `.claude/skills/skill-library/SKILL.md` only if you move many skills in-tree; not needed today.

## VERIFICATION


| Check                                  | Result                                                       |
| -------------------------------------- | ------------------------------------------------------------ |
| `.claude/skills` present in repo       | **No** (only `.claude/settings.local.json` seen).            |
| Python / Java / etc. in `src/`         | **No** (TS + Astro web only).                                |
| `package.json` matches DAILY narrative | **Yes** (Bun, Hono, Drizzle, Clerk, Zod, Biome, Playwright). |


**Open questions:** None blocking. If `hono-template-ts.mdc` drifts from `AppError` / `src/types/hono.d.ts`, align in a separate rules pass.

## Operator checklist (shared harness / Cursor)

- In **Cursor**: keep project rules lean (two `.mdc` files + `alwaysApply` only where needed).
- In **Claude Code** (global): prefer **agent-sort** or manual bucket when this repo is primary — pin **bun-runtime**, **typescript-reviewer**, **backend-patterns** as high-signal; leave off-stack skills in library.
- Re-run this doc when stack materially changes (e.g. add Rails sidecar).