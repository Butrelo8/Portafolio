# Portfolio Conversion — Design Spec

**Date:** 2026-04-25
**Status:** Approved (pending user spec review)
**Owner:** Iván Ávila (`Butrelo8`)
**Repo:** `Mi-Portafolio` (currently a fork of `hono-template`)

---

## 1. Goal

Convert this repository from a generic Hono + Astro template into a personal portfolio site that displays the author's web apps and projects published under `github.com/Butrelo8`. The site must:

- Pull project data live from the GitHub API.
- Filter to repos tagged with the topic `portfolio`.
- Allow per-project metadata overrides via README frontmatter and portfolio-side MDX files.
- Render a bilingual (English / Spanish) portfolio with a hybrid page structure (single-scroll home + dedicated detail pages).
- Adopt a neo-brutalist visual identity.
- Deploy frontend to Vercel and backend to Render (free tier acceptable).

## 2. Non-Goals

- No user authentication, accounts, or admin UI. Updates ship via git commits.
- No persistent database (no Turso, no SQLite). All caching is in-memory.
- No contact form in v1. A `mailto:` link plus social links suffices.
- No analytics, view counters, or submission logs in v1.
- No CMS integration.

## 3. Stack

| Layer    | Choice                                                  |
| -------- | ------------------------------------------------------- |
| Frontend | Astro 4.16 (Vercel adapter, hybrid output) on Vercel    |
| Backend  | Hono 4 + Bun on Render (native Bun runtime, free tier)  |
| Storage  | None (in-memory LRU cache only)                         |
| API auth | GitHub PAT with `public_repo` scope                     |
| Cron     | `cron-job.org` (external, free)                         |
| i18n     | Astro built-in (`en` default, `es` under `/es/`)        |
| Styling  | CSS custom properties, no Tailwind                      |
| Tests    | `bun:test` (API), Playwright (E2E + visual regression)  |

## 4. Architecture

### 4.1 Data Flow

```
[Vercel Build / cron-job.org]
        │
        ▼
   GET /projects   (Hono on Render)
        │
        ├── cache hit?  yes → return cached
        │
        ▼  no
   Fetch GH /users/Butrelo8/repos
        │
        ├── filter by topic 'portfolio'
        ├── fetch README.md per repo (parallel)
        ├── parse frontmatter (gray-matter)
        └── store in in-memory cache (TTL 10 min)
        │
        ▼
   Astro renders pages → Vercel CDN
        │
        ▼
   Visitor (always served pre-rendered HTML)
```

The Hono backend is **never on the visitor's critical path**. Only the build process and the cron-job.org pinger ever call it. Visitors always receive pre-rendered HTML from Vercel's edge.

### 4.2 Override Resolution

For each project, fields are resolved in the following order (last write wins):

1. **GitHub API base** — `name`, `description`, `topics`, `stargazers_count`, `language`, `homepage`, `html_url`, `updated_at`.
2. **README frontmatter** — fields parsed from the project repo's `README.md` frontmatter: `tagline`, `screenshot`, `stack[]`, `featured`, `order`.
3. **Portfolio override file** — optional `web/src/content/projects/<slug>.{en,es}.mdx` in this repo. Frontmatter overrides the above, body becomes the long-form writeup.

If no portfolio override exists, the project detail page falls back to rendering the GitHub README markdown directly.

### 4.3 Cron-Driven Revalidation

```
[cron-job.org]  every 10 min
        │
        ▼
GET https://<vercel-domain>/api/revalidate?secret=<CRON_SECRET>
        │
        ├── verify secret (constant-time compare) → 401 if invalid
        ├── POST Hono /projects (warms backend cache)
        └── trigger Vercel On-Demand ISR for /projects/[slug] paths
```

`CRON_SECRET` is a 32+ character random string stored in both Vercel and cron-job.org.

## 5. Backend (Hono on Render)

### 5.1 Module Layout

```
src/
├── index.ts                     # Bun.serve entry (mostly unchanged)
├── env.ts                       # adds GITHUB_TOKEN, GITHUB_USERNAME, PORTFOLIO_TOPIC, CACHE_TTL_MS
├── lib/
│   ├── errors.ts                # unchanged (AppError + envelope)
│   ├── githubClient.ts          # NEW — fetch wrapper, token auth, retry on 5xx
│   ├── projectAggregator.ts     # NEW — list repos → filter → fetch READMEs → parse → merge
│   └── cache.ts                 # NEW — in-memory TTL cache (Map-based, no eviction beyond TTL)
├── middleware/
│   ├── error.ts                 # unchanged
│   ├── validate.ts              # unchanged
│   ├── security.ts              # unchanged
│   ├── httpsRedirect.ts         # unchanged
│   ├── requestLogger.ts         # unchanged
│   ├── socketIp.ts              # unchanged
│   ├── cors.ts                  # unchanged (config from env.ALLOWED_ORIGINS)
│   ├── bodyLimit.ts             # unchanged
│   └── rateLimitFactory.ts      # unchanged
└── routes/
    ├── index.ts                 # mountRoutes()
    ├── health.ts                # unchanged
    └── projects.ts              # NEW — GET / and GET /:slug
```

**Removed:** `src/db/`, `src/middleware/auth.ts`, `src/routes/items.ts`, `drizzle.config.ts`, all `tests/items.*` files. The auth context-var declarations in `src/types/hono.d.ts` are removed.

### 5.2 Endpoints

| Method | Path              | Response                                                  |
| ------ | ----------------- | --------------------------------------------------------- |
| GET    | `/health`         | `{ ok: true }`                                            |
| GET    | `/projects`       | `{ projects: Project[], cachedAt: string }`               |
| GET    | `/projects/:slug` | `{ project: Project }` or `404 NOT_FOUND`                 |

### 5.3 Project Type

```ts
type Project = {
  slug: string;            // repo name lowercased, kebab-case
  name: string;            // display name (frontmatter override > GH name)
  description: string;
  tagline: string | null;  // frontmatter
  stack: string[];         // frontmatter; fallback = topics minus portfolio topic
  language: string | null; // primary GH language
  stars: number;
  homepage: string | null; // live demo URL
  repoUrl: string;
  screenshot: string | null;
  readmeMarkdown: string;  // raw README body (after frontmatter strip)
  featured: boolean;
  order: number | null;
  updatedAt: string;       // ISO 8601
};
```

### 5.4 Cache Behavior

- In-memory `Map<string, { value, expiresAt }>`.
- Two cache keys: `projects:list`, `projects:slug:<slug>`.
- TTL = `CACHE_TTL_MS` (default 600,000 ms / 10 min).
- On miss: fetch list, then fetch READMEs in parallel (`Promise.all` with bounded concurrency = 5).
- Cache invalidation is purely TTL-based; no manual purge endpoint.

### 5.5 Failure Modes

- GitHub API 5xx or rate limit: return last cached value if present, else `503 INTERNAL`.
- Single README fetch fail: log warning, project ships without `readmeMarkdown` (set to empty string).
- Unparseable frontmatter: log warning, fall through to GH base fields.

## 6. Frontend (Astro on Vercel)

### 6.1 Astro Config

- Adapter: `@astrojs/vercel/serverless` (replaces `@astrojs/node`).
- Output: `hybrid` (most pages static, opt-in ISR per route).
- i18n: `defaultLocale: 'en'`, `locales: ['en', 'es']`, prefix strategy: default locale at root, `/es/` for Spanish.

### 6.2 Page Structure

```
web/src/pages/
├── index.astro                  # EN home — single scroll: hero + projects grid + about + contact
├── projects/[slug].astro        # EN project detail (ISR, 10 min)
├── es/
│   ├── index.astro              # ES home
│   └── projects/[slug].astro    # ES project detail (ISR, 10 min)
└── api/
    └── revalidate.ts            # cron target — verifies CRON_SECRET, warms Hono, triggers ISR
```

### 6.3 ISR Configuration

Per route file:

```ts
export const prerender = true;
export const config = { isr: { expiration: 600 } };
```

### 6.4 Content Collections

```
web/src/content/
├── config.ts                    # Zod schema for project + about overrides
├── projects/
│   ├── <slug>.en.mdx            # optional override
│   └── <slug>.es.mdx
└── about/
    ├── en.mdx                   # static bio
    └── es.mdx
```

`config.ts` defines a Zod schema mirroring the `Project` type so override merges are type-safe.

### 6.5 i18n Strings

- `web/src/i18n/en.json` and `es.json` hold UI labels (nav, section headers, CTAs).
- A `useTranslations(locale)` helper resolves at build time.

### 6.6 Project Detail Composition

1. Fetch project from Hono `/projects/:slug` at build (and on ISR revalidation).
2. Look up override MDX in the content collection by `slug + locale`.
3. Render: hero (name, tagline, stack chips), override body MDX if present, otherwise GH README markdown, plus a meta strip (stars, last update, repo + live links).

### 6.7 GitHub Stats Widget

- Build-time fetch `/users/Butrelo8` for totals (followers, public repo count).
- Optionally fetch top languages via aggregation across visible repos (already in cache).
- Rendered in `about/{en,es}.mdx` as `<GitHubStats />` Astro component.

## 7. Visual System (Neo-Brutalism)

### 7.1 Tokens (`web/src/styles/tokens.css`)

```css
:root {
  --color-bg:        #fafafa;
  --color-fg:        #0a0a0a;
  --color-accent:    #ff4500;       /* hot orange */
  --color-accent-2:  #1d4ed8;       /* electric blue */
  --color-mute:      #737373;
  --border-w:        3px;
  --shadow-brut:     6px 6px 0 var(--color-fg);
  --font-display:    'JetBrains Mono', 'Courier New', monospace;
  --font-body:       'Inter', system-ui, sans-serif;
}

[data-theme='dark'] {
  --color-bg: #0a0a0a;
  --color-fg: #fafafa;
}
```

### 7.2 Component Inventory

- `<BrutBox>` — wrapper with thick border and offset shadow.
- `<HeroBlock>` — name, tagline, scroll indicator.
- `<ProjectTile>` — repo card: name, tagline, stack chips, star count.
- `<StackChip>` — keyboard-style box per tech.
- `<GitHubStats>` — totals card with raw monospace numbers.
- `<LangSwitch>` — EN/ES toggle in nav.
- `<Nav>` — anchor nav on home, breadcrumb on detail.

### 7.3 Motion

- Hover on `<ProjectTile>`: shadow shifts from `6px 6px` to `2px 2px` while content translates `(4px, 4px)` over 200 ms with `cubic-bezier(0.16, 1, 0.3, 1)`.
- All motion respects `prefers-reduced-motion: reduce`.

## 8. Migration Plan (PR Sequence)

1. **PR 1 — strip stateful template code.** Remove Drizzle, Clerk, libsql, items route, db tests, `drizzle.config.ts`, `Dockerfile`, `fly.toml`. Update `package.json`, `tsconfig.json`, `bunfig.toml`, `tests/preload.ts`. CI must stay green.
2. **PR 2 — Hono projects API.** Add `lib/githubClient.ts`, `lib/projectAggregator.ts`, `lib/cache.ts`, `routes/projects.ts`. Tests use `bun:test` with mocked `fetch`.
3. **PR 3 — Astro shell.** Swap to Vercel adapter, configure i18n, scaffold content collections schema, create empty route files.
4. **PR 4 — visual system.** Tokens, components, brutalism layout. Static design only — no data wiring yet.
5. **PR 5 — wire data.** Astro fetches Hono, ISR config, override merge logic, MDX rendering on detail pages.
6. **PR 6 — revalidate endpoint.** `/api/revalidate` with `CRON_SECRET`, on-demand ISR triggers.
7. **PR 7 — deploy.** Render Hono service via native Bun runtime, Vercel Astro project, cron-job.org configuration, env wiring.

## 9. Testing Strategy

- **Hono unit tests (`bun:test`):** `cache` (TTL behavior), `projectAggregator` (mocked GH responses, frontmatter parsing, filtering), `routes/projects` integration.
- **Astro E2E (Playwright):** homepage loads, project tile click navigates to detail, language toggle switches between `/` and `/es/`, mailto link present.
- **Visual regression (Playwright):** screenshots at 320, 768, 1440 for home and one detail page in both locales.
- **Accessibility (`@axe-core/playwright`):** smoke run on home and detail pages.
- **Coverage target:** 80% on the Hono backend.

## 10. Environment Variables

### Hono (Render)

| Var                    | Required | Notes                                        |
| ---------------------- | -------- | -------------------------------------------- |
| `PORT`                 | yes      | Render injects                               |
| `NODE_ENV`             | yes      | `production`                                 |
| `LOG_LEVEL`            | no       | default `info`                               |
| `ALLOWED_ORIGINS`      | yes      | Vercel prod + preview + `localhost:4321`     |
| `RATE_LIMIT_MAX`       | no       | default 100                                  |
| `RATE_LIMIT_WINDOW_MS` | no       | default 60_000                               |
| `TRUST_PROXY`          | yes      | `true` (Render sets `X-Forwarded-For`)       |
| `GITHUB_TOKEN`         | yes      | PAT with `public_repo` scope                 |
| `GITHUB_USERNAME`      | yes      | `Butrelo8`                                   |
| `PORTFOLIO_TOPIC`      | yes      | `portfolio`                                  |
| `CACHE_TTL_MS`         | no       | default 600_000                              |

### Astro (Vercel)

| Var              | Required | Notes                                  |
| ---------------- | -------- | -------------------------------------- |
| `PUBLIC_API_URL` | yes      | Render service URL                     |
| `CRON_SECRET`    | yes      | 32+ char random, shared with cron-job  |

### cron-job.org

Stores `CRON_SECRET` either in the URL query string or as a header. Hits `/api/revalidate` every 10 minutes.

## 11. Documentation Updates

- `CLAUDE.md` — full rewrite: new stack, new commands, new architecture sections.
- `README.md` — full rewrite: portfolio purpose, deploy guide, content workflow.
- `DECISIONS.md` — log topic-tag selection, ISR via cron-job.org, no DB, neo-brutalism direction.
- `TODOS.md` — clear template tickets, add the seven migration tickets above.
- Delete: `Dockerfile`, `fly.toml`.
- `.cursor/rules/hono-template.mdc` — rewrite to reflect new project (no auth, no DB) or rename to `portfolio-conventions.mdc`.

## 12. Open Risks

- **GitHub API rate limit** — even authenticated, 5000/hr is shared across all token uses. Cache TTL of 10 min and bounded README concurrency keep us well under.
- **Render cold start on cron miss** — if cron-job.org skips a tick, Hono may sleep. The next build/cron call eats the cold start; visitors are unaffected (always served from Vercel).
- **README frontmatter discipline** — relies on the author maintaining frontmatter in project repos. Mitigated by the override-file fallback.
- **Brutalism accessibility** — high contrast borders are good for a11y, but motion-on-hover and tight type require careful focus states and reduced-motion handling.
