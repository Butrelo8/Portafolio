# Mi Portafolio

Freelance portfolio — bilingual (EN/ES) case studies of shipped client work.

**Stack:** Astro 4.16 (static) · content collections · astro:assets · Biome
**Deploy:** Cloudflare Workers (static assets), built in GitHub Actions
**Live:** https://mi-portafolio.bube-ncio8.workers.dev

No server, no database, no API, no credentials to build. Case studies are markdown in the repo.
Spanish is the default language; English mirrors under `/en/`.

---

## Setup

```bash
bun install                                     # root: Biome only
cd web && bun install && cp .env.example .env   # optional: PUBLIC_WEB3FORMS_KEY
bun run dev                                     # :4321
```

The only env var is the Web3Forms key for the contact form. Without it the form degrades to an
email link, and everything else builds.

---

## Deploy

GitHub Actions (`.github/workflows/deploy-web.yml`) builds `web/` and deploys to Cloudflare Workers
on every push to `main`.

Repo secrets: `CLOUDFLARE_API_TOKEN` (must be **Workers**-scoped — an R2-only token authenticates
but fails with an opaque `code: 10000`), `CLOUDFLARE_ACCOUNT_ID`.
Repo variables: `PUBLIC_WEB3FORMS_KEY`.

GitHub reserves the `GITHUB_` prefix for both secrets and variables; names starting with it are
rejected with HTTP 422.

---

## Commands

| Command                   | Does                      |
| ------------------------- | ------------------------- |
| `bun run dev`             | Astro dev (:4321)         |
| `bun run build`           | Astro prod build → `web/dist` |
| `bun run typecheck`       | `astro check` + `tsc`     |
| `bun run lint` / `lint:fix` | Biome over `web/`       |

Root scripts delegate to `web/`. Biome skips `*.astro` (it misreads frontmatter vars used in the
template as unused) and the generated `web/.astro/` types.

---

## Adding a case study

Two files — `web/src/content/projects/en/<slug>.md` and `es/<slug>.md`, same slug:

```yaml
---
name: Project Name
client: Who it was for
year: 2026
tagline: One line a client understands without reading further.
summary: Card blurb — longer than the tagline, shorter than the case study.
stack: ["Next.js", "PostgreSQL"]
liveUrl: https://example.com     # optional
repoUrl: https://github.com/...  # optional
screenshot: ../../../assets/shots/name.png   # optional
order: 1
---
```

Body is three sections: **The problem**, **What I built**, **Result** — written for a business
owner, not a developer. Screenshots go in `web/src/assets/shots/` — never `public/`, so Astro can
convert them to webp at build.

Add a `testimonial: { quote, author, role }` block only when a real quote exists.

### Client confidentiality

Some work is under NDA. When a client can't be named, the anonymisation has to cover **all** of:
copy, front-matter, image alt text, the screenshot itself, **and the slug** — a slug is a public
URL. Round the figures (`180+`, not `181`) and drop fine-grained breakdowns; exact counts identify
an organisation even with the name removed. Don't redirect the old slug to the new one: the old
URL is the thing you're hiding. And keep the source repo private if it carries their branding.

## Contact form

`ContactForm.astro` POSTs straight to Web3Forms — no server. The access key is public by design
(it's in the page HTML), so it's a repo **variable**, not a secret.

A hidden `redirect` field sends visitors to `/gracias/` or `/en/thanks/` on this domain instead of
Web3Forms' branded confirmation page. That URL is absolute, built from `site` in
`astro.config.mjs` — **update `site` when the domain changes**.

Enquiries arrive at whichever inbox registered the key.

---

## i18n

**Spanish is the default**: ES at `/`, EN at `/en/`. Astro i18n routing
(`prefixDefaultLocale: false`). Adding a page means adding both. About content lives in
`web/src/content/about/es.md` + `en.md`. Legacy `/es/*` URLs redirect to the root.

---

## History

Two deletions, both recorded in `DECISIONS.md`:

1. A Hono + Bun API on Cloudflare Workers that proxied GitHub. The site is `output: 'static'`, so it
   only ever served our own CI — never a visitor.
2. The build-time GitHub fetch that replaced it. Once the audience was settled as freelance clients,
   repo metadata was the wrong source: two of the four projects are private repos, and their value
   isn't described by stars or a README.

Both are in git history if a real backend is ever needed.
