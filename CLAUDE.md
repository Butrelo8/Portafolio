# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Web        | Astro 4.16, `output: 'static'` (no adapter)          |
| Data       | GitHub repos by topic, `gray-matter` README parsing  |
| Rendering  | `marked` → `sanitize-html` for README bodies         |
| Lint       | Biome (single config at root, covers `web/`)         |
| Deploy     | Cloudflare Workers (static assets) via GitHub Actions |

**No API, no server, no database.** There was a Hono API; it only ever served the build, so it was
deleted (see README "History"). Don't reintroduce one unless the task genuinely needs a runtime —
a contact form, newsletter, or an endpoint that hides a secret key.

Cursor rules live in `.cursor/rules/*.mdc`; CLAUDE.md wins on any conflict.

## Commands

```bash
bun install              # root: Biome only
bun run dev              # → cd web && astro dev, :4321
bun run build            # → web/dist
bun run typecheck        # astro check + tsc
bun run lint / lint:fix  # biome check web
```

Web deps install separately: `cd web && bun install`. Needs `web/.env` with `GITHUB_TOKEN` +
`GITHUB_USERNAME` (see `web/.env.example`).

CI (`.github/workflows/ci.yml`) = lint → typecheck. Deploy (`deploy-web.yml`) builds and ships to
Cloudflare on push to `main`.

## Architecture

**One package that matters:** `web/` (Astro). The root `package.json` holds Biome and script
delegation, nothing else.

**Data flow.** `web/src/lib/projects.ts` is the whole backend. During `astro build` it lists public
repos for `GITHUB_USERNAME` filtered by `PORTFOLIO_TOPIC`, fetches each README, parses frontmatter
with `gray-matter`, renders the body through `marked` + `sanitize-html`, sorts by `order` then
stars. The result is memoized in a module-level promise so a build hits GitHub once.

**Env.** Read via `ENV` in `projects.ts` — `{ ...process.env, ...import.meta.env }`, because `.env`
values arrive through Vite's `import.meta.env` while CI secrets arrive through `process.env`.
Never `PUBLIC_`-prefix the token: that would ship it to the browser.

**Sanitization.** README HTML is rendered with `set:html`, so it MUST stay sanitized. Never pass
raw markdown or unsanitized HTML to `set:html`.

**i18n.** English at `web/src/pages/*`, Spanish mirrored under `web/src/pages/es/*`. Adding a page
means adding both.

**Biome scope.** `biome.json` excludes `*.astro` (frontmatter vars used in the template read as
unused) and the generated `web/.astro/`. Astro files are checked by `astro check` instead.

## Conventions

- Files kebab-case; exports camelCase, named (no default exports); Astro components PascalCase.
- User-facing copy: English (plus the `es/` mirror).
- TS strict; single quotes, semicolons, 100-col (Biome).

## Environment

`web/.env`: `GITHUB_TOKEN` (public_repo scope), `GITHUB_USERNAME`, optional `PORTFOLIO_TOPIC`
(default `portfolio`).

Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PORTFOLIO_GITHUB_TOKEN`
(Actions reserves the name `GITHUB_TOKEN`). Variables: `PORTFOLIO_GITHUB_USERNAME`, `PORTFOLIO_TOPIC` (GitHub reserves the `GITHUB_` prefix).
