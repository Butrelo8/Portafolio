# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Web        | Astro 7, `output: 'static'` (no adapter)          |
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

**Client confidentiality — read before touching a case study.** Some client work is under NDA. The
inventory case study is anonymised, and the anonymisation is load-bearing:
- No client name, logo, or brand anywhere in copy, front-matter, alt text, **or the slug** (the slug
  is a public URL — `ecooceano-inventario` was renamed to `inventario-lite` for exactly this).
- Figures are rounded (`180+`, not `181`) and fine-grained breakdowns are removed. Exact counts
  fingerprint an organisation even without its name.
- Screenshots of internal tools are re-captured with the branding hidden and the numbers rounded,
  by editing the live DOM before the capture — see "Screenshots" below.
- The private source repo must stay private. `Inv.-Lite-A` was flipped to private on 2026-09-07
  because it contained the client's name in `index.html`/`App.tsx`/`Login.tsx` and their `logo.jpg`.
- When anonymising, **do not add a redirect from the old slug** — the old URL is itself the leak.

**Screenshots.** Live in `web/src/assets/shots/`, referenced from front-matter and optimised by
`astro:assets` at build time. Never put them in `public/` — that ships the raw multi-MB PNG (the
four shots are 4.7MB as PNG and 111kB as webp at the largest width).

Captured from the live apps with the chrome-devtools MCP: navigate, `resize_page` to 1440×900,
`take_screenshot`. For anything with client branding or real data, run `evaluate_script` first to
hide logos, replace the client name, round the headline numbers and remove per-category
breakdowns — then capture. Card crops are `height: 220px; object-fit: cover; object-position: top`,
so put the interesting part of the UI near the top of the viewport.

**Contact.** `ContactForm.astro` POSTs to Web3Forms — no server involved. Notes:
- `PUBLIC_WEB3FORMS_KEY` is public by design (it ships in the HTML). It is a **variable**, not a secret.
- Without the key the form is replaced by an email link, so the build never breaks on a missing key.
- A hidden `redirect` field returns the visitor to `/gracias/` (es) or `/en/thanks/` (en) instead of
  Web3Forms' own branded page. It needs an **absolute** URL, which is why `astro.config.mjs` sets
  `site`. **Change `site` when the domain changes or the redirect will point at the old host.**
- A hidden `botcheck` honeypot input is the spam defence. Keep it off-screen, never `display:none`
  in a way that breaks Web3Forms' own check.
- Enquiries land in the inbox that registered the key — currently `av.ivan.8@gmail.com`. Verified
  end-to-end on 2026-09-07.

**Personal tooling strip.** `ToolStrip.astro` holds Sonus, Sotto, ApuestasWrapper and MPAF in a
plain array with `en`/`es` strings — no collection, because there are no bodies and no images. None
are published, so entries are deliberately link-free. Add a link only if a repo goes public.

**i18n.** **Spanish is the default** — the clients are in Veracruz. Spanish lives at
`web/src/pages/*` (served from `/`), English mirrors under `web/src/pages/en/*` (served from `/en/`).
Adding a page means adding both. `astro.config.mjs` redirects the legacy `/es/*` URLs to the root.

**Biome scope.** `biome.json` excludes `*.astro` (frontmatter vars used in the template read as
unused) and the generated `web/.astro/`. Astro files are checked by `astro check` instead.

## Conventions

- Files kebab-case; exports camelCase, named (no default exports); Astro components PascalCase.
- User-facing copy: **Spanish first**, English mirrored. Write Spanish as Spanish — not a literal
  translation of the English.
- Case study bodies are three sections: problem → what I built → result. Business outcome, not
  architecture. Name the technology once, at the end of "what I built".
- Never claim a result the client hasn't confirmed. "Launches on this platform" is honest when the
  service is new; "handling real bookings today" is not, unless it is.
- TS strict; single quotes, semicolons, 100-col (Biome).

## Environment

`web/.env`: `PUBLIC_WEB3FORMS_KEY` (contact form). Nothing else — the build needs no credentials.

Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Variables: `PUBLIC_WEB3FORMS_KEY`.

Gotchas paid for once already:
- The Cloudflare token must be **Workers**-scoped. An R2-only token authenticates fine and then
  fails deploy with an opaque `Authentication error [code: 10000]`.
- GitHub reserves the `GITHUB_` prefix for **both** secrets and variables — a name like
  `GITHUB_USERNAME` is rejected outright (HTTP 422).
- CI installs with `--frozen-lockfile`, so run `bun install` at the root after changing root deps.

## Life-OS TODOs

Life-OS project tag: portafolio

<!-- mpaf:diseno-figma:start -->
Figma: antes de cualquier skill `figma:*` o herramienta de Figma, carga la skill `figma`.
<!-- mpaf:diseno-figma:end -->
