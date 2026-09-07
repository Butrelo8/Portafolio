# Mi Portafolio

Personal portfolio site. GitHub repos tagged `portfolio` → bilingual (EN/ES) static site.

**Stack:** Astro 4.16 (static) · GitHub API · gray-matter · marked + sanitize-html · Biome
**Deploy:** Cloudflare Workers (static assets), built in GitHub Actions

No server. Project data is fetched from GitHub at **build time**, so visitors get plain HTML and
nothing ever calls the GitHub API from the browser. A new deploy is how the site refreshes.

---

## Setup

```bash
bun install                                     # root: Biome only
cd web && bun install && cp .env.example .env   # fill GITHUB_TOKEN + GITHUB_USERNAME
bun run dev                                     # :4321
```

`GITHUB_TOKEN` needs only `public_repo` scope.

---

## Deploy

GitHub Actions (`.github/workflows/deploy-web.yml`) builds `web/` and deploys to Cloudflare Workers
on every push to `main`.

Repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PORTFOLIO_GITHUB_TOKEN`.
Repo variables: `PORTFOLIO_GITHUB_USERNAME`, `PORTFOLIO_TOPIC`.

GitHub reserves the `GITHUB_` prefix for its own secrets and variables, hence the `PORTFOLIO_` names.

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

## How Projects Work

`web/src/lib/projects.ts` runs during `astro build`:

1. Lists public repos for `GITHUB_USERNAME`, keeps those tagged `PORTFOLIO_TOPIC`
2. Fetches each repo's `README.md`
3. `gray-matter` parses frontmatter; `marked` + `sanitize-html` render the body to safe HTML
4. Sorts by `order`, then stars
5. Memoized per build — one pass over the GitHub API no matter how many pages import it

**README frontmatter fields** (in your portfolio repos):
```yaml
---
tagline: "Short one-liner"
stack: ["TypeScript", "Hono", "Bun"]
screenshot: "https://..."
featured: true
order: 1
---
```

---

## i18n

EN at `/`, ES at `/es/`. Astro i18n routing (`prefixDefaultLocale: false`). Adding a page means
adding both. About content lives in `web/src/content/about/en.md` + `es.md`.

---

## History

This repo used to ship a Hono + Bun API on Cloudflare Workers that proxied GitHub for the site.
Since the site is `output: 'static'`, that API only ever served the build — so it was removed and
the fetch moved into the build. It's in git history if a real backend is ever needed (a contact
form, a newsletter, an LLM-backed tool).
