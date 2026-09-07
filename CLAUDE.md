# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Web        | Astro 4.16, `output: 'static'` (no adapter)          |
| Content    | Astro content collections — markdown case studies    |
| Images     | `astro:assets` (build-time webp + responsive widths) |
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

Web deps install separately: `cd web && bun install`. The build needs no credentials.

CI (`.github/workflows/ci.yml`) = lint → typecheck. Deploy (`deploy-web.yml`) builds and ships to
Cloudflare on push to `main`.

## Architecture

**One package that matters:** `web/` (Astro). The root `package.json` holds Biome and script
delegation, nothing else.

**Content.** Case studies are markdown in `web/src/content/projects/{en,es}/<slug>.md`, one file per
project per language, schema in `web/src/content/config.ts`. Pages filter by `p.id.startsWith('en/')`
and sort on `order`. There is no fetch and no token — the build reads the repo and nothing else.

**Audience.** The site targets prospective **freelance clients**, not employers or OSS peers. Copy is
about what a business got, not what the code does. See `DECISIONS.md`.

**Screenshots.** Live in `web/src/assets/shots/`, referenced from front-matter and optimised by
`astro:assets` at build time. Never put them in `public/` — that ships the raw multi-MB PNG.

**Contact.** `ContactForm.astro` posts to Web3Forms. `PUBLIC_WEB3FORMS_KEY` is public by design; the
form degrades to an email link when it's unset.

**i18n.** English at `web/src/pages/*`, Spanish mirrored under `web/src/pages/es/*`. Adding a page
means adding both.

**Biome scope.** `biome.json` excludes `*.astro` (frontmatter vars used in the template read as
unused) and the generated `web/.astro/`. Astro files are checked by `astro check` instead.

## Conventions

- Files kebab-case; exports camelCase, named (no default exports); Astro components PascalCase.
- User-facing copy: English (plus the `es/` mirror).
- TS strict; single quotes, semicolons, 100-col (Biome).

## Environment

`web/.env`: `PUBLIC_WEB3FORMS_KEY` (contact form).

Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Variables: `PUBLIC_WEB3FORMS_KEY`.
The Cloudflare token must be **Workers**-scoped — an R2-only token authenticates but fails deploy
with an opaque `code: 10000`.
