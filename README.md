# Mi Portafolio

Personal portfolio API + frontend. GitHub repos tagged `portfolio` → bilingual (EN/ES) site.

**Stack:** Hono 4 + Bun (API) · Astro 4.16 ISR (Web) · GitHub API · gray-matter · TtlCache · Resend
**Deploy:** Render (API) · Vercel (Web)

---

## Quick Start

```bash
# API
bun install
cp .env.example .env      # fill GITHUB_TOKEN, GITHUB_USERNAME, etc.
bun run dev               # :3001

# Web
cd web && bun install && cp .env.example .env   # fill PUBLIC_API_URL
bun run dev               # :4321
```

---

## Deploy

### API → Render

1. New Web Service → connect repo, root dir `/`, runtime Bun
2. Build: `bun install` · Start: `bun run start`
3. Set env vars (see `.env.example`): `GITHUB_TOKEN`, `GITHUB_USERNAME`, `PORTFOLIO_TOPIC`, `CRON_SECRET`, `ALLOWED_ORIGINS`

### Web → Vercel

1. New project → root dir `web/`
2. Framework: Astro
3. Set `PUBLIC_API_URL` → your Render API URL

### Cache Revalidation

API caches GitHub data 10 min in-process. To warm before ISR refresh, schedule a POST ping:

```
POST /api/revalidate
Authorization: Bearer <CRON_SECRET>
```

Use [cron-job.org](https://cron-job.org) or similar, every 9 min.

---

## Commands

| Command             | Purpose                  |
| ------------------- | ------------------------ |
| `bun run dev`       | API hot reload (:3001)   |
| `bun test`          | Unit + integration tests |
| `bun run test:e2e`  | Playwright E2E           |
| `bun run lint`      | Biome check              |
| `bun run typecheck` | TS type check            |
| `cd web && bun run dev` | Astro dev (:4321)   |
| `cd web && bun run build` | Astro prod build  |

---

## How Projects Work

1. GitHub API lists public repos for `GITHUB_USERNAME` filtered by topic `PORTFOLIO_TOPIC`
2. `GitHubClient.getReadme(repo)` fetches each repo's `README.md`
3. `gray-matter` parses frontmatter: `tagline`, `stack`, `screenshot`, `featured`, `order`
4. `TtlCache` stores result 10 min in-process
5. Astro pages fetch `GET /projects` at build/ISR time

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

## Infrastructure

### GitHub Client (`src/lib/githubClient.ts`)
Wraps GitHub REST API. `listRepos(topic)` + `getReadme(repo)`. Requires `GITHUB_TOKEN` with `public_repo` scope.

### Cache (`src/lib/cache.ts`)
`TtlCache<T>` — in-process Map, default 10 min TTL. Not shared across replicas; single Render instance fine.

### Env (`src/env.ts`)
Zod-validated. Fails fast at boot. Never read `process.env` directly — import `env`.

### Error Handling
Throw `AppError(code, message, status)`. `onError` formats `{ error: { code, message, status } }`.

### Rate Limiting
In-memory fixed-window per process. `RATE_LIMIT_MAX` + `RATE_LIMIT_WINDOW_MS`. Stricter limit on `/health`.

### i18n
EN at `/`, ES at `/es/`. Astro i18n routing (`prefixDefaultLocale: false`). About content in `web/src/content/about/en.md` + `es.md`.

### Health
`GET /health` → `{ status, version, uptimeSeconds, time }`