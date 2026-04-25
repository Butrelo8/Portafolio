# Portfolio Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert this Hono template into a bilingual (EN/ES) personal portfolio API that serves GitHub projects tagged `portfolio`, consumed by an Astro frontend on Vercel.

**Architecture:** Hono 4 + Bun on Render (stateless — no DB, no auth). Astro 4 on Vercel with ISR (600s). GitHub API fetched through TtlCache (in-memory, 10min). cron-job.org pings `/api/revalidate` every 10min to warm cache before ISR refresh.

**Tech Stack:** Hono 4, Bun, TypeScript strict, Astro 4 (@astrojs/vercel), gray-matter, Zod, Playwright (E2E), Biome (lint)

---

## Phase 1 — Strip Clerk / Drizzle / libsql (PR 1)

### Task 1: Remove DB and auth dependencies from package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Read current package.json**

```bash
cat package.json
```

- [ ] **Step 2: Remove deps and scripts**

Remove from `dependencies`: `@clerk/backend`, `@libsql/client`, `drizzle-orm`
Remove from `devDependencies`: `drizzle-kit`
Remove scripts: `db:generate`, `db:migrate`, `db:studio`
Add to `dependencies`: `"gray-matter": "^4.0.3"`
Change `"name"` to `"mi-portafolio-api"`

- [ ] **Step 3: Install**

```bash
bun install
```

Expected: lockfile updated, no Clerk/Drizzle/libsql packages.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore: replace clerk/drizzle/libsql with gray-matter"
```

---

### Task 2: Replace env.ts

**Files:**
- Modify: `src/env.ts`
- Create: `tests/env.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/env.test.ts
import { describe, expect, test, beforeEach } from 'bun:test'

describe('env', () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'ghp_test'
    process.env.GITHUB_USERNAME = 'testuser'
    process.env.PORTFOLIO_TOPIC = 'portfolio'
  })

  test('parses required vars', async () => {
    const { env } = await import('../src/env')
    expect(env.GITHUB_TOKEN).toBe('ghp_test')
    expect(env.GITHUB_USERNAME).toBe('testuser')
    expect(env.PORTFOLIO_TOPIC).toBe('portfolio')
  })

  test('CACHE_TTL_MS defaults to 600000', async () => {
    delete process.env.CACHE_TTL_MS
    const { env } = await import('../src/env')
    expect(env.CACHE_TTL_MS).toBe(600000)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test tests/env.test.ts
```

Expected: FAIL — `GITHUB_TOKEN` not found in schema.

- [ ] **Step 3: Replace src/env.ts**

```typescript
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_USERNAME: z.string().min(1),
  PORTFOLIO_TOPIC: z.string().default('portfolio'),
  CACHE_TTL_MS: z.coerce.number().default(600_000),
  CRON_SECRET: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default('*'),
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
})

export const env = schema.parse(process.env)
export type Env = z.infer<typeof schema>
```

- [ ] **Step 4: Run — expect PASS**

```bash
bun test tests/env.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/env.ts tests/env.test.ts
git commit -m "feat: replace clerk/db env vars with github portfolio vars"
```

---

### Task 3: Delete DB files

**Files:**
- Delete: `src/db/` (entire directory)
- Delete: `drizzle.config.ts`
- Delete: `drizzle/` (if exists)

- [ ] **Step 1: Remove**

```bash
rm -rf src/db drizzle.config.ts drizzle
```

- [ ] **Step 2: Typecheck — expect errors (fixed in Task 4)**

```bash
bun run typecheck 2>&1 | head -30
```

- [ ] **Step 3: Commit deletions**

```bash
git add -A
git commit -m "chore: delete drizzle db directory and config"
```

---

### Task 4: Remove auth and db from src/index.ts

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Read current src/index.ts**

```bash
cat src/index.ts
```

- [ ] **Step 2: Remove Clerk, db, auth param from mountRoutes**

Edit `src/index.ts` to:
- Remove `import { createClerkVerifier }` and `import { closeDb }`
- Remove `const auth = createClerkVerifier(...)`
- Change `mountRoutes(auth)` → `mountRoutes()`
- Remove `closeDb` from shutdown manager registrations

Keep: `createShutdownManager`, `attachSignals`, `requestLogger`, `security`, `cors`, `bodyLimit`, `rateLimitFactory`, `errorHandler`.

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck
```

Expected: errors about missing items route — fixed in Task 5.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "refactor: remove clerk auth and db wiring from entry point"
```

---

### Task 5: Delete items route and replace routes/index.ts

**Files:**
- Delete: `src/routes/items.ts`
- Modify: `src/routes/index.ts`

- [ ] **Step 1: Delete items route**

```bash
rm src/routes/items.ts
```

- [ ] **Step 2: Replace src/routes/index.ts**

```typescript
import { Hono } from 'hono'
import health from './health'

export function mountRoutes(): Hono {
  const app = new Hono()
  app.route('/health', health)
  return app
}
```

- [ ] **Step 3: Typecheck**

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/routes/index.ts src/routes/items.ts
git commit -m "refactor: remove items route, stub mountRoutes without auth"
```

---

### Task 6: Delete auth middleware and strip user context types

**Files:**
- Delete: `src/middleware/auth.ts` (if exists)
- Modify: `src/types/hono.d.ts`

- [ ] **Step 1: Check and delete auth middleware**

```bash
ls src/middleware/
rm -f src/middleware/auth.ts
```

- [ ] **Step 2: Read src/types/hono.d.ts**

```bash
cat src/types/hono.d.ts
```

- [ ] **Step 3: Strip userId/sessionId from ContextVariableMap**

Remove `userId` and `sessionId` entries. Keep `validated`, `requestId`, `clientRequestId`, `socketIp`.

- [ ] **Step 4: Typecheck**

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/middleware/ src/types/hono.d.ts
git commit -m "chore: remove auth middleware and user context types"
```

---

### Task 7: Replace tests/preload.ts

**Files:**
- Modify: `tests/preload.ts`

- [ ] **Step 1: Replace with minimal env defaults**

```typescript
// tests/preload.ts — sets env before any src/ module loads
process.env.NODE_ENV = 'test'
process.env.GITHUB_TOKEN = 'ghp_test_token_placeholder'
process.env.GITHUB_USERNAME = 'testuser'
process.env.PORTFOLIO_TOPIC = 'portfolio'
process.env.CACHE_TTL_MS = '60000'
process.env.CRON_SECRET = 'test-secret'
process.env.ALLOWED_ORIGINS = '*'
```

- [ ] **Step 2: Run tests**

```bash
bun test
```

Expected: existing tests pass (env + health).

- [ ] **Step 3: Commit**

```bash
git add tests/preload.ts
git commit -m "chore: replace sqlite preload with github env defaults for tests"
```

---

### Task 8: Delete items tests and verify clean build

**Files:**
- Delete: `tests/items/` (entire directory if exists)
- Delete: `tests/routes/items.test.ts` (if exists)

- [ ] **Step 1: Delete**

```bash
rm -rf tests/items tests/routes/items.test.ts 2>/dev/null; true
```

- [ ] **Step 2: Full check**

```bash
bun run typecheck && bun test && bun run lint
```

Expected: all pass, no items or DB references.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete items tests — phase 1 strip complete"
```

---

## Phase 2 — Hono Projects API (PR 2)

### Task 9: TtlCache utility

**Files:**
- Create: `src/lib/cache.ts`
- Create: `tests/lib/cache.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/lib/cache.test.ts
import { describe, expect, test } from 'bun:test'
import { TtlCache } from '../../src/lib/cache'

describe('TtlCache', () => {
  test('returns undefined for missing key', () => {
    const c = new TtlCache<string>(1000)
    expect(c.get('x')).toBeUndefined()
  })

  test('returns value before TTL expires', () => {
    const c = new TtlCache<string>(60_000)
    c.set('k', 'v')
    expect(c.get('k')).toBe('v')
  })

  test('returns undefined after TTL expires', async () => {
    const c = new TtlCache<string>(10)
    c.set('k', 'v')
    await new Promise((r) => setTimeout(r, 20))
    expect(c.get('k')).toBeUndefined()
  })

  test('clear removes all entries', () => {
    const c = new TtlCache<string>(60_000)
    c.set('a', '1')
    c.set('b', '2')
    c.clear()
    expect(c.get('a')).toBeUndefined()
    expect(c.get('b')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test tests/lib/cache.test.ts
```

- [ ] **Step 3: Implement src/lib/cache.ts**

```typescript
interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>()

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  clear(): void {
    this.store.clear()
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
bun test tests/lib/cache.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/cache.ts tests/lib/cache.test.ts
git commit -m "feat: add TtlCache utility"
```

---

### Task 10: GitHubClient

**Files:**
- Create: `src/lib/githubClient.ts`
- Create: `tests/lib/githubClient.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/lib/githubClient.test.ts
import { describe, expect, test, mock, beforeEach } from 'bun:test'

const mockFetch = mock(() => Promise.resolve())
global.fetch = mockFetch as unknown as typeof fetch

import { GitHubClient } from '../../src/lib/githubClient'

const client = new GitHubClient('ghp_test', 'testuser')

describe('GitHubClient', () => {
  beforeEach(() => mockFetch.mockClear())

  test('listRepos calls correct GitHub API endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ name: 'my-app', topics: ['portfolio'] }],
    } as Response)

    const repos = await client.listRepos('portfolio')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/users/testuser/repos?per_page=100&sort=updated&type=public',
      expect.objectContaining({ headers: expect.any(Object) })
    )
    expect(repos).toHaveLength(1)
    expect(repos[0]!.name).toBe('my-app')
  })

  test('listRepos filters by topic', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { name: 'a', topics: ['portfolio'] },
        { name: 'b', topics: ['other'] },
      ],
    } as Response)

    const repos = await client.listRepos('portfolio')
    expect(repos).toHaveLength(1)
    expect(repos[0]!.name).toBe('a')
  })

  test('getReadme returns decoded content', async () => {
    const content = Buffer.from('# Hello').toString('base64')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: content + '\n', encoding: 'base64' }),
    } as Response)

    const readme = await client.getReadme('my-app')
    expect(readme).toBe('# Hello')
  })

  test('getReadme returns null when not found', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 } as Response)
    const readme = await client.getReadme('no-readme')
    expect(readme).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test tests/lib/githubClient.test.ts
```

- [ ] **Step 3: Implement src/lib/githubClient.ts**

```typescript
export interface GithubRepo {
  name: string
  description: string | null
  homepage: string | null
  language: string | null
  stargazers_count: number
  html_url: string
  topics: string[]
  pushed_at: string
}

export class GitHubClient {
  private readonly baseUrl = 'https://api.github.com'
  private readonly headers: Record<string, string>

  constructor(
    private readonly token: string,
    private readonly username: string
  ) {
    this.headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
  }

  async listRepos(topic: string): Promise<GithubRepo[]> {
    const url = `${this.baseUrl}/users/${this.username}/repos?per_page=100&sort=updated&type=public`
    const res = await fetch(url, { headers: this.headers })
    if (!res.ok) throw new Error(`GitHub listRepos failed: ${res.status}`)
    const all: GithubRepo[] = await res.json()
    return all.filter((r) => r.topics.includes(topic))
  }

  async getReadme(repo: string): Promise<string | null> {
    const url = `${this.baseUrl}/repos/${this.username}/${repo}/readme`
    const res = await fetch(url, { headers: this.headers })
    if (!res.ok) return null
    const data: { content: string; encoding: string } = await res.json()
    return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8')
  }
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
bun test tests/lib/githubClient.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/githubClient.ts tests/lib/githubClient.test.ts
git commit -m "feat: add GitHubClient with listRepos and getReadme"
```

---

### Task 11: Project type and projectAggregator

**Files:**
- Create: `src/lib/project.ts`
- Create: `src/lib/projectAggregator.ts`
- Create: `tests/lib/projectAggregator.test.ts`

- [ ] **Step 1: Create src/lib/project.ts**

```typescript
export interface Project {
  slug: string
  name: string
  description: string
  tagline: string | null
  stack: string[]
  language: string | null
  stars: number
  homepage: string | null
  repoUrl: string
  screenshot: string | null
  readmeMarkdown: string
  featured: boolean
  order: number | null
  updatedAt: string
}
```

- [ ] **Step 2: Write failing test**

```typescript
// tests/lib/projectAggregator.test.ts
import { describe, expect, test, mock } from 'bun:test'
import type { GithubRepo } from '../../src/lib/githubClient'

const mockClient = {
  listRepos: mock(async () => [] as GithubRepo[]),
  getReadme: mock(async () => null as string | null),
}

mock.module('../../src/lib/githubClient', () => ({
  GitHubClient: mock(() => mockClient),
}))

import { buildProjects } from '../../src/lib/projectAggregator'

const baseRepo: GithubRepo = {
  name: 'my-app',
  description: 'A cool app',
  homepage: 'https://myapp.com',
  language: 'TypeScript',
  stargazers_count: 42,
  html_url: 'https://github.com/testuser/my-app',
  topics: ['portfolio'],
  pushed_at: '2024-01-01T00:00:00Z',
}

describe('buildProjects', () => {
  test('builds project from repo with no README frontmatter', async () => {
    mockClient.listRepos.mockResolvedValueOnce([baseRepo])
    mockClient.getReadme.mockResolvedValueOnce('# My App\nContent here.')

    const projects = await buildProjects(mockClient as any, 'portfolio')

    expect(projects).toHaveLength(1)
    const p = projects[0]!
    expect(p.slug).toBe('my-app')
    expect(p.name).toBe('my-app')
    expect(p.description).toBe('A cool app')
    expect(p.stars).toBe(42)
    expect(p.featured).toBe(false)
    expect(p.readmeMarkdown).toBe('# My App\nContent here.')
  })

  test('README frontmatter overrides base fields', async () => {
    mockClient.listRepos.mockResolvedValueOnce([baseRepo])
    mockClient.getReadme.mockResolvedValueOnce(
      '---\ntagline: Best app ever\nfeatured: true\norder: 1\nstack:\n  - Bun\n  - Hono\n---\n# Content'
    )

    const projects = await buildProjects(mockClient as any, 'portfolio')
    const p = projects[0]!
    expect(p.tagline).toBe('Best app ever')
    expect(p.featured).toBe(true)
    expect(p.order).toBe(1)
    expect(p.stack).toEqual(['Bun', 'Hono'])
  })

  test('handles null README gracefully', async () => {
    mockClient.listRepos.mockResolvedValueOnce([baseRepo])
    mockClient.getReadme.mockResolvedValueOnce(null)

    const projects = await buildProjects(mockClient as any, 'portfolio')
    expect(projects[0]!.readmeMarkdown).toBe('')
  })

  test('returns empty array when no portfolio repos', async () => {
    mockClient.listRepos.mockResolvedValueOnce([])
    const projects = await buildProjects(mockClient as any, 'portfolio')
    expect(projects).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Run — expect FAIL**

```bash
bun test tests/lib/projectAggregator.test.ts
```

- [ ] **Step 4: Implement src/lib/projectAggregator.ts**

```typescript
import matter from 'gray-matter'
import type { GitHubClient, GithubRepo } from './githubClient'
import type { Project } from './project'

interface ReadmeFrontmatter {
  tagline?: string
  stack?: string[]
  screenshot?: string
  featured?: boolean
  order?: number
}

function repoToProject(repo: GithubRepo, readme: string | null): Project {
  const raw = readme ?? ''
  const { data, content } = matter(raw)
  const fm = data as ReadmeFrontmatter

  return {
    slug: repo.name,
    name: repo.name,
    description: repo.description ?? '',
    tagline: fm.tagline ?? null,
    stack: fm.stack ?? (repo.language ? [repo.language] : []),
    language: repo.language,
    stars: repo.stargazers_count,
    homepage: repo.homepage,
    repoUrl: repo.html_url,
    screenshot: fm.screenshot ?? null,
    readmeMarkdown: content.trim(),
    featured: fm.featured ?? false,
    order: fm.order ?? null,
    updatedAt: repo.pushed_at,
  }
}

export async function buildProjects(
  client: GitHubClient,
  topic: string
): Promise<Project[]> {
  const repos = await client.listRepos(topic)

  const projects = await Promise.all(
    repos.map(async (repo) => {
      const readme = await client.getReadme(repo.name)
      return repoToProject(repo, readme)
    })
  )

  return projects.sort((a, b) => {
    if (a.order !== null && b.order !== null) return a.order - b.order
    if (a.order !== null) return -1
    if (b.order !== null) return 1
    return b.stars - a.stars
  })
}
```

- [ ] **Step 5: Run — expect PASS**

```bash
bun test tests/lib/projectAggregator.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/project.ts src/lib/projectAggregator.ts tests/lib/projectAggregator.test.ts
git commit -m "feat: add Project type and projectAggregator with gray-matter parsing"
```

---

### Task 12: Projects route

**Files:**
- Create: `src/routes/projects.ts`
- Create: `tests/routes/projects.test.ts`
- Modify: `src/routes/index.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/routes/projects.test.ts
import { describe, expect, test, mock } from 'bun:test'
import type { Project } from '../../src/lib/project'

const mockProject: Project = {
  slug: 'my-app',
  name: 'my-app',
  description: 'A cool app',
  tagline: null,
  stack: ['TypeScript'],
  language: 'TypeScript',
  stars: 42,
  homepage: null,
  repoUrl: 'https://github.com/testuser/my-app',
  screenshot: null,
  readmeMarkdown: '# My App',
  featured: false,
  order: null,
  updatedAt: '2024-01-01T00:00:00Z',
}

mock.module('../../src/lib/projectAggregator', () => ({
  buildProjects: mock(async () => [mockProject]),
}))

mock.module('../../src/lib/githubClient', () => ({
  GitHubClient: mock(() => ({})),
}))

mock.module('../../src/env', () => ({
  env: {
    GITHUB_TOKEN: 'test',
    GITHUB_USERNAME: 'testuser',
    PORTFOLIO_TOPIC: 'portfolio',
    CACHE_TTL_MS: 60000,
  },
}))

import app from '../../src/routes/projects'

describe('GET /projects', () => {
  test('returns 200 with projects array', async () => {
    const res = await app.request('/projects')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].slug).toBe('my-app')
  })
})

describe('GET /projects/:slug', () => {
  test('returns 200 for known slug', async () => {
    const res = await app.request('/projects/my-app')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.slug).toBe('my-app')
  })

  test('returns 404 for unknown slug', async () => {
    const res = await app.request('/projects/does-not-exist')
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test tests/routes/projects.test.ts
```

- [ ] **Step 3: Create src/routes/projects.ts**

```typescript
import { Hono } from 'hono'
import { env } from '../env'
import { GitHubClient } from '../lib/githubClient'
import { TtlCache } from '../lib/cache'
import { buildProjects } from '../lib/projectAggregator'
import type { Project } from '../lib/project'
import { AppError } from '../lib/errors'

const cache = new TtlCache<Project[]>(env.CACHE_TTL_MS)
const client = new GitHubClient(env.GITHUB_TOKEN, env.GITHUB_USERNAME)

const CACHE_KEY = 'projects'

async function getProjects(): Promise<Project[]> {
  const cached = cache.get(CACHE_KEY)
  if (cached) return cached
  const projects = await buildProjects(client, env.PORTFOLIO_TOPIC)
  cache.set(CACHE_KEY, projects)
  return projects
}

const app = new Hono()

app.get('/projects', async (c) => {
  const projects = await getProjects()
  return c.json({ success: true, data: projects })
})

app.get('/projects/:slug', async (c) => {
  const slug = c.req.param('slug')
  const projects = await getProjects()
  const project = projects.find((p) => p.slug === slug)
  if (!project) throw new AppError('NOT_FOUND', `Project "${slug}" not found`, 404)
  return c.json({ success: true, data: project })
})

export { cache as projectsCache }
export default app
```

- [ ] **Step 4: Wire into src/routes/index.ts**

```typescript
import { Hono } from 'hono'
import health from './health'
import projects from './projects'

export function mountRoutes(): Hono {
  const app = new Hono()
  app.route('/health', health)
  app.route('/', projects)
  return app
}
```

- [ ] **Step 5: Run — expect PASS**

```bash
bun test tests/routes/projects.test.ts
```

- [ ] **Step 6: Full test + typecheck**

```bash
bun test && bun run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/routes/projects.ts src/routes/index.ts tests/routes/projects.test.ts
git commit -m "feat: add /projects and /projects/:slug endpoints with TtlCache"
```

---

### Task 13: Revalidate endpoint

**Files:**
- Create: `src/routes/revalidate.ts`
- Create: `tests/routes/revalidate.test.ts`
- Modify: `src/routes/index.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/routes/revalidate.test.ts
import { describe, expect, test, mock } from 'bun:test'

mock.module('../../src/env', () => ({
  env: { CRON_SECRET: 'correct-secret' },
}))

mock.module('../../src/routes/projects', () => ({
  projectsCache: { clear: mock(() => {}) },
  default: new (require('hono').Hono)(),
}))

import app from '../../src/routes/revalidate'

describe('POST /api/revalidate', () => {
  test('returns 401 with wrong secret', async () => {
    const res = await app.request('/api/revalidate', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong' },
    })
    expect(res.status).toBe(401)
  })

  test('returns 200 and clears cache with correct secret', async () => {
    const res = await app.request('/api/revalidate', {
      method: 'POST',
      headers: { Authorization: 'Bearer correct-secret' },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun test tests/routes/revalidate.test.ts
```

- [ ] **Step 3: Implement src/routes/revalidate.ts**

```typescript
import { Hono } from 'hono'
import { timingSafeEqual } from 'crypto'
import { env } from '../env'
import { projectsCache } from './projects'

function safeCompare(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab) // consume time even on length mismatch
    return false
  }
  return timingSafeEqual(ab, bb)
}

const app = new Hono()

app.post('/api/revalidate', async (c) => {
  const secret = env.CRON_SECRET
  if (!secret) {
    return c.json({ success: false, error: 'Revalidate endpoint not configured' }, 403)
  }

  const auth = c.req.header('Authorization') ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''

  if (!safeCompare(secret, provided)) {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }

  projectsCache.clear()
  return c.json({ success: true, revalidated: true })
})

export default app
```

- [ ] **Step 4: Add to src/routes/index.ts**

```typescript
import { Hono } from 'hono'
import health from './health'
import projects from './projects'
import revalidate from './revalidate'

export function mountRoutes(): Hono {
  const app = new Hono()
  app.route('/health', health)
  app.route('/', projects)
  app.route('/', revalidate)
  return app
}
```

- [ ] **Step 5: Run — expect PASS**

```bash
bun test tests/routes/revalidate.test.ts && bun test && bun run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/routes/revalidate.ts src/routes/index.ts tests/routes/revalidate.test.ts
git commit -m "feat: add /api/revalidate endpoint with timing-safe secret check"
```

---

## Phase 3 — Astro Frontend Shell (PR 3)

### Task 14: Add Vercel adapter and i18n to Astro config

**Files:**
- Modify: `web/package.json`
- Modify: `web/astro.config.mjs`

- [ ] **Step 1: Add Vercel adapter**

```bash
cd web && bun add @astrojs/vercel
```

- [ ] **Step 2: Replace web/astro.config.mjs**

```javascript
import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel/serverless'

export default defineConfig({
  output: 'hybrid',
  adapter: vercel({
    isr: {
      expiration: 600,
    },
  }),
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
})
```

- [ ] **Step 3: Build check**

```bash
cd web && bun run build 2>&1 | tail -20
```

Expected: successful build.

- [ ] **Step 4: Commit**

```bash
git add web/package.json web/astro.config.mjs web/bun.lockb
git commit -m "feat: add @astrojs/vercel adapter with ISR 600s and i18n en/es"
```

---

### Task 15: Content collections for projects and about

**Files:**
- Create: `web/src/content/config.ts`
- Create: `web/src/content/about/en.mdx`
- Create: `web/src/content/about/es.mdx`

- [ ] **Step 1: Create web/src/content/config.ts**

```typescript
import { defineCollection, z } from 'astro:content'

const projectsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    tagline: z.string().optional(),
    stack: z.array(z.string()).default([]),
    screenshot: z.string().optional(),
    featured: z.boolean().default(false),
    order: z.number().optional(),
  }),
})

const aboutCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
  }),
})

export const collections = {
  projects: projectsCollection,
  about: aboutCollection,
}
```

- [ ] **Step 2: Create web/src/content/about/en.mdx**

```mdx
---
title: About Me
---

I'm a full-stack developer who builds web applications with TypeScript, Hono, and Astro.

I focus on clean APIs, fast frontends, and open-source work you can actually use.

## What I work with

- **Backend:** Hono, Bun, Node.js
- **Frontend:** Astro, React, vanilla TypeScript
- **Database:** PostgreSQL, SQLite, Turso
- **Deploy:** Vercel, Render, Fly.io

## Get in touch

[av.ivan.8@gmail.com](mailto:av.ivan.8@gmail.com) · [GitHub](https://github.com/Butrelo8)
```

- [ ] **Step 3: Create web/src/content/about/es.mdx**

```mdx
---
title: Sobre Mí
---

Soy un desarrollador full-stack que construye aplicaciones web con TypeScript, Hono y Astro.

Me enfoco en APIs limpias, frontends rápidos y trabajo open source que puedes usar de verdad.

## Con qué trabajo

- **Backend:** Hono, Bun, Node.js
- **Frontend:** Astro, React, TypeScript vanilla
- **Base de datos:** PostgreSQL, SQLite, Turso
- **Deploy:** Vercel, Render, Fly.io

## Contacto

[av.ivan.8@gmail.com](mailto:av.ivan.8@gmail.com) · [GitHub](https://github.com/Butrelo8)
```

- [ ] **Step 4: Typecheck**

```bash
cd web && bun run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add web/src/content/
git commit -m "feat: add Astro content collections for projects and about"
```

---

### Task 16: API client and route stubs

**Files:**
- Create: `web/src/lib/api.ts`
- Create: `web/src/pages/index.astro`
- Create: `web/src/pages/es/index.astro`
- Create: `web/src/pages/projects/[slug].astro`
- Create: `web/src/pages/es/projects/[slug].astro`
- Create: `web/src/pages/about.astro`
- Create: `web/src/pages/es/about.astro`

- [ ] **Step 1: Create web/src/lib/api.ts**

```typescript
const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000'

export interface Project {
  slug: string
  name: string
  description: string
  tagline: string | null
  stack: string[]
  language: string | null
  stars: number
  homepage: string | null
  repoUrl: string
  screenshot: string | null
  readmeMarkdown: string
  featured: boolean
  order: number | null
  updatedAt: string
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/projects`)
  if (!res.ok) throw new Error(`fetchProjects failed: ${res.status}`)
  const body: { success: boolean; data: Project[] } = await res.json()
  return body.data
}

export async function fetchProject(slug: string): Promise<Project | null> {
  const res = await fetch(`${API_URL}/projects/${slug}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`fetchProject failed: ${res.status}`)
  const body: { success: boolean; data: Project } = await res.json()
  return body.data
}
```

- [ ] **Step 2: Create web/src/pages/index.astro (stub)**

```astro
---
export const prerender = true
import { fetchProjects } from '../lib/api'
const projects = await fetchProjects()
---
<html lang="en"><head><title>Portfolio</title></head><body>
  <h1>Projects</h1>
  <ul>{projects.map(p => <li><a href={`/projects/${p.slug}`}>{p.name}</a></li>)}</ul>
</body></html>
```

- [ ] **Step 3: Create web/src/pages/es/index.astro (stub)**

```astro
---
export const prerender = true
import { fetchProjects } from '../../lib/api'
const projects = await fetchProjects()
---
<html lang="es"><head><title>Portafolio</title></head><body>
  <h1>Proyectos</h1>
  <ul>{projects.map(p => <li><a href={`/es/projects/${p.slug}`}>{p.name}</a></li>)}</ul>
</body></html>
```

- [ ] **Step 4: Create web/src/pages/projects/[slug].astro (stub)**

```astro
---
export const prerender = true
import { fetchProjects, fetchProject } from '../../lib/api'
export async function getStaticPaths() {
  const projects = await fetchProjects()
  return projects.map(p => ({ params: { slug: p.slug } }))
}
const { slug } = Astro.params
const project = await fetchProject(slug)
if (!project) return Astro.redirect('/404')
---
<html lang="en"><head><title>{project.name}</title></head><body>
  <h1>{project.name}</h1><p>{project.description}</p>
</body></html>
```

- [ ] **Step 5: Create web/src/pages/es/projects/[slug].astro (stub)**

```astro
---
export const prerender = true
import { fetchProjects, fetchProject } from '../../../lib/api'
export async function getStaticPaths() {
  const projects = await fetchProjects()
  return projects.map(p => ({ params: { slug: p.slug } }))
}
const { slug } = Astro.params
const project = await fetchProject(slug)
if (!project) return Astro.redirect('/404')
---
<html lang="es"><head><title>{project.name}</title></head><body>
  <h1>{project.name}</h1><p>{project.description}</p>
</body></html>
```

- [ ] **Step 6: Create web/src/pages/about.astro (stub)**

```astro
---
export const prerender = true
import { getEntry } from 'astro:content'
const about = await getEntry('about', 'en')
const { Content } = await about!.render()
---
<html lang="en"><head><title>About</title></head><body><Content /></body></html>
```

- [ ] **Step 7: Create web/src/pages/es/about.astro (stub)**

```astro
---
export const prerender = true
import { getEntry } from 'astro:content'
const about = await getEntry('about', 'es')
const { Content } = await about!.render()
---
<html lang="es"><head><title>Sobre Mí</title></head><body><Content /></body></html>
```

- [ ] **Step 8: Build**

```bash
cd web && bun run build 2>&1 | tail -20
```

Expected: all routes pre-rendered, no errors.

- [ ] **Step 9: Commit**

```bash
git add web/src/pages/ web/src/lib/api.ts
git commit -m "feat: add Astro route stubs and API client for EN/ES pages"
```

---

## Phase 4 — Visual System / Neo-Brutalism (PR 4)

### Task 17: Design tokens and global CSS

**Files:**
- Create: `web/src/styles/tokens.css`
- Create: `web/src/styles/global.css`

- [ ] **Step 1: Create web/src/styles/tokens.css**

```css
:root {
  /* Palette */
  --color-bg: #f5f0e8;
  --color-fg: #1a1a1a;
  --color-accent: #ff4500;
  --color-accent-hover: #e03d00;
  --color-surface: #ffffff;
  --color-border: #1a1a1a;
  --color-muted: #6b6b6b;

  /* Typography */
  --font-mono: 'JetBrains Mono', 'Fira Mono', monospace;
  --font-sans: 'Inter', system-ui, sans-serif;

  --text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-sm: clamp(0.875rem, 0.8rem + 0.35vw, 1rem);
  --text-base: clamp(1rem, 0.92rem + 0.4vw, 1.125rem);
  --text-lg: clamp(1.125rem, 1rem + 0.6vw, 1.375rem);
  --text-xl: clamp(1.375rem, 1.1rem + 1.35vw, 2rem);
  --text-2xl: clamp(2rem, 1.4rem + 3vw, 3.5rem);
  --text-hero: clamp(3rem, 1.5rem + 7.5vw, 7rem);

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-section: clamp(4rem, 3rem + 5vw, 10rem);

  /* Neo-brutalism */
  --border-width: 2px;
  --border-width-thick: 3px;
  --shadow-brut: 6px 6px 0 var(--color-fg);
  --shadow-brut-sm: 3px 3px 0 var(--color-fg);
  --shadow-brut-accent: 6px 6px 0 var(--color-accent);
  --radius-none: 0;

  /* Motion */
  --duration-fast: 120ms;
  --duration-normal: 250ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

- [ ] **Step 2: Create web/src/styles/global.css**

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;700&display=swap');
@import './tokens.css';

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html { scroll-behavior: smooth; }

body {
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; text-decoration: none; }
img, video { max-width: 100%; display: block; }

.brut-card {
  background: var(--color-surface);
  border: var(--border-width-thick) solid var(--color-border);
  box-shadow: var(--shadow-brut);
  transition: box-shadow var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

.brut-card:hover {
  box-shadow: var(--shadow-brut-accent);
  transform: translate(-2px, -2px);
}

.brut-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  background: var(--color-accent);
  color: var(--color-surface);
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: var(--text-sm);
  border: var(--border-width-thick) solid var(--color-border);
  box-shadow: var(--shadow-brut-sm);
  cursor: pointer;
  transition: box-shadow var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out);
}

.brut-btn:hover {
  box-shadow: none;
  transform: translate(3px, 3px);
}

.mono { font-family: var(--font-mono); }

.container {
  width: 100%;
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: var(--space-6);
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/styles/
git commit -m "feat: add neo-brutalism design tokens and global CSS"
```

---

### Task 18: ProjectCard component

**Files:**
- Create: `web/src/components/ProjectCard.astro`

- [ ] **Step 1: Create web/src/components/ProjectCard.astro**

```astro
---
import type { Project } from '../lib/api'

interface Props {
  project: Project
  lang: 'en' | 'es'
}

const { project, lang } = Astro.props
const href = lang === 'es' ? `/es/projects/${project.slug}` : `/projects/${project.slug}`
---

<article class="brut-card project-card">
  {project.screenshot && (
    <div class="project-card__image">
      <img src={project.screenshot} alt={`${project.name} screenshot`} loading="lazy" />
    </div>
  )}
  <div class="project-card__body">
    <div class="project-card__meta mono">
      <span>★ {project.stars}</span>
      {project.language && <span>{project.language}</span>}
    </div>
    <h3 class="project-card__name mono">{project.name}</h3>
    {project.tagline && <p class="project-card__tagline">{project.tagline}</p>}
    <p class="project-card__desc">{project.description}</p>
    <ul class="project-card__stack" aria-label="Tech stack">
      {project.stack.map(t => <li class="mono">{t}</li>)}
    </ul>
    <div class="project-card__links">
      <a href={href} class="brut-btn">
        {lang === 'es' ? 'Ver proyecto' : 'View project'}
      </a>
      {project.homepage && (
        <a href={project.homepage} target="_blank" rel="noopener noreferrer" class="brut-btn brut-btn--secondary">
          {lang === 'es' ? 'Demo en vivo' : 'Live demo'}
        </a>
      )}
    </div>
  </div>
</article>

<style>
  .project-card { display: flex; flex-direction: column; }
  .project-card__image img { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-bottom: var(--border-width-thick) solid var(--color-border); }
  .project-card__body { padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-3); flex: 1; }
  .project-card__meta { display: flex; gap: var(--space-4); font-size: var(--text-xs); color: var(--color-muted); }
  .project-card__name { font-size: var(--text-lg); font-weight: 700; }
  .project-card__tagline { font-size: var(--text-sm); color: var(--color-accent); font-weight: 600; }
  .project-card__desc { font-size: var(--text-sm); color: var(--color-muted); flex: 1; }
  .project-card__stack { display: flex; flex-wrap: wrap; gap: var(--space-2); list-style: none; font-size: var(--text-xs); }
  .project-card__stack li { padding: var(--space-1) var(--space-2); border: var(--border-width) solid var(--color-border); background: var(--color-bg); }
  .project-card__links { display: flex; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-2); }
  .brut-btn--secondary { background: var(--color-surface); color: var(--color-fg); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/ProjectCard.astro
git commit -m "feat: add neo-brutalism ProjectCard component"
```

---

### Task 19: BaseLayout and Nav

**Files:**
- Create: `web/src/components/Nav.astro`
- Create: `web/src/layouts/BaseLayout.astro`

- [ ] **Step 1: Create web/src/components/Nav.astro**

```astro
---
interface Props {
  lang: 'en' | 'es'
  currentPath: string
}

const { lang, currentPath } = Astro.props
const otherLang = lang === 'en' ? 'es' : 'en'
const otherPath = lang === 'en'
  ? `/es${currentPath}`
  : currentPath.replace(/^\/es/, '') || '/'

const links = lang === 'en'
  ? [{ href: '/', label: 'Projects' }, { href: '/about', label: 'About' }]
  : [{ href: '/es/', label: 'Proyectos' }, { href: '/es/about', label: 'Sobre mí' }]
---

<nav class="nav" aria-label="Main navigation">
  <div class="container nav__inner">
    <a href={lang === 'en' ? '/' : '/es/'} class="nav__brand mono">{'<portfolio />'}</a>
    <ul class="nav__links" role="list">
      {links.map(l => <li><a href={l.href} class="nav__link mono">{l.label}</a></li>)}
    </ul>
    <a href={otherPath} class="nav__lang mono" aria-label={`Switch to ${otherLang}`}>
      {otherLang.toUpperCase()}
    </a>
  </div>
</nav>

<style>
  .nav { border-bottom: var(--border-width-thick) solid var(--color-border); background: var(--color-bg); position: sticky; top: 0; z-index: 100; }
  .nav__inner { display: flex; align-items: center; gap: var(--space-8); padding-block: var(--space-4); }
  .nav__brand { font-size: var(--text-lg); font-weight: 700; color: var(--color-accent); margin-right: auto; }
  .nav__links { display: flex; gap: var(--space-6); list-style: none; }
  .nav__link { font-size: var(--text-sm); font-weight: 600; transition: color var(--duration-fast); }
  .nav__link:hover { color: var(--color-accent); }
  .nav__lang { padding: var(--space-1) var(--space-3); border: var(--border-width) solid var(--color-border); font-size: var(--text-xs); font-weight: 700; transition: background var(--duration-fast), color var(--duration-fast); }
  .nav__lang:hover { background: var(--color-fg); color: var(--color-bg); }
</style>
```

- [ ] **Step 2: Create web/src/layouts/BaseLayout.astro**

```astro
---
import Nav from '../components/Nav.astro'
import '../styles/global.css'

interface Props {
  title: string
  description?: string
  lang?: 'en' | 'es'
}

const { title, description = '', lang = 'en' } = Astro.props
const currentPath = Astro.url.pathname
---

<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <title>{title}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <Nav lang={lang} currentPath={currentPath} />
    <main><slot /></main>
    <footer class="footer">
      <div class="container footer__inner mono">
        <p>© {new Date().getFullYear()} — Built with Astro + Hono</p>
        <div class="footer__social">
          <a href="https://github.com/Butrelo8" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </div>
    </footer>
  </body>
</html>

<style>
  main { min-height: calc(100vh - 8rem); }
  .footer { border-top: var(--border-width-thick) solid var(--color-border); padding-block: var(--space-8); background: var(--color-fg); color: var(--color-bg); }
  .footer__inner { display: flex; justify-content: space-between; align-items: center; font-size: var(--text-xs); }
  .footer__social { display: flex; gap: var(--space-4); }
  .footer__social a:hover { color: var(--color-accent); }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add web/src/layouts/ web/src/components/Nav.astro
git commit -m "feat: add BaseLayout and Nav with lang switcher"
```

---

## Phase 5 — Wire Data Into Pages (PR 5)

### Task 20: Home page EN — real layout

**Files:**
- Modify: `web/src/pages/index.astro`

- [ ] **Step 1: Replace web/src/pages/index.astro**

```astro
---
export const prerender = true
import BaseLayout from '../layouts/BaseLayout.astro'
import ProjectCard from '../components/ProjectCard.astro'
import { fetchProjects } from '../lib/api'

const projects = await fetchProjects()
const featured = projects.filter(p => p.featured)
const rest = projects.filter(p => !p.featured)
---

<BaseLayout title="Portfolio" description="My open-source projects" lang="en">
  <section class="hero container">
    <p class="hero__label mono">hello world</p>
    <h1 class="hero__title">
      I build things<br />
      <span class="hero__accent">for the web.</span>
    </h1>
    <p class="hero__sub">Full-stack developer. Open source contributor. TypeScript enthusiast.</p>
  </section>

  {featured.length > 0 && (
    <section class="section container">
      <h2 class="section__title mono">// featured</h2>
      <div class="grid grid--featured">
        {featured.map(p => <ProjectCard project={p} lang="en" />)}
      </div>
    </section>
  )}

  <section class="section container">
    <h2 class="section__title mono">// all projects</h2>
    <div class="grid">
      {rest.map(p => <ProjectCard project={p} lang="en" />)}
    </div>
  </section>
</BaseLayout>

<style>
  .hero { padding-top: var(--space-section); padding-bottom: var(--space-16); }
  .hero__label { font-size: var(--text-sm); color: var(--color-accent); font-weight: 700; margin-bottom: var(--space-4); text-transform: uppercase; letter-spacing: 0.1em; }
  .hero__title { font-family: var(--font-mono); font-size: var(--text-hero); font-weight: 700; line-height: 1.05; margin-bottom: var(--space-6); }
  .hero__accent { color: var(--color-accent); -webkit-text-stroke: 2px var(--color-fg); }
  .hero__sub { font-size: var(--text-lg); color: var(--color-muted); max-width: 48ch; }
  .section { padding-block: var(--space-16); }
  .section__title { font-size: var(--text-xl); font-weight: 700; margin-bottom: var(--space-8); color: var(--color-muted); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-6); }
  .grid--featured { grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); }
</style>
```

- [ ] **Step 2: Build**

```bash
cd web && bun run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/index.astro
git commit -m "feat: wire EN home page with hero, featured, and projects grid"
```

---

### Task 21: Home page ES — real layout

**Files:**
- Modify: `web/src/pages/es/index.astro`

- [ ] **Step 1: Replace web/src/pages/es/index.astro**

```astro
---
export const prerender = true
import BaseLayout from '../../layouts/BaseLayout.astro'
import ProjectCard from '../../components/ProjectCard.astro'
import { fetchProjects } from '../../lib/api'

const projects = await fetchProjects()
const featured = projects.filter(p => p.featured)
const rest = projects.filter(p => !p.featured)
---

<BaseLayout title="Portafolio" description="Mis proyectos open source" lang="es">
  <section class="hero container">
    <p class="hero__label mono">hola mundo</p>
    <h1 class="hero__title">
      Construyo cosas<br />
      <span class="hero__accent">para la web.</span>
    </h1>
    <p class="hero__sub">Desarrollador full-stack. Contribuidor open source. Entusiasta de TypeScript.</p>
  </section>

  {featured.length > 0 && (
    <section class="section container">
      <h2 class="section__title mono">// destacados</h2>
      <div class="grid grid--featured">
        {featured.map(p => <ProjectCard project={p} lang="es" />)}
      </div>
    </section>
  )}

  <section class="section container">
    <h2 class="section__title mono">// todos los proyectos</h2>
    <div class="grid">
      {rest.map(p => <ProjectCard project={p} lang="es" />)}
    </div>
  </section>
</BaseLayout>

<style>
  .hero { padding-top: var(--space-section); padding-bottom: var(--space-16); }
  .hero__label { font-size: var(--text-sm); color: var(--color-accent); font-weight: 700; margin-bottom: var(--space-4); text-transform: uppercase; letter-spacing: 0.1em; }
  .hero__title { font-family: var(--font-mono); font-size: var(--text-hero); font-weight: 700; line-height: 1.05; margin-bottom: var(--space-6); }
  .hero__accent { color: var(--color-accent); -webkit-text-stroke: 2px var(--color-fg); }
  .hero__sub { font-size: var(--text-lg); color: var(--color-muted); max-width: 48ch; }
  .section { padding-block: var(--space-16); }
  .section__title { font-size: var(--text-xl); font-weight: 700; margin-bottom: var(--space-8); color: var(--color-muted); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-6); }
  .grid--featured { grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add web/src/pages/es/index.astro
git commit -m "feat: wire ES home page with hero, featured, and projects grid"
```

---

### Task 22: Project detail pages EN/ES

**Files:**
- Modify: `web/src/pages/projects/[slug].astro`
- Modify: `web/src/pages/es/projects/[slug].astro`

- [ ] **Step 1: Replace web/src/pages/projects/[slug].astro**

```astro
---
export const prerender = true
import BaseLayout from '../../layouts/BaseLayout.astro'
import { fetchProjects, fetchProject } from '../../lib/api'

export async function getStaticPaths() {
  const projects = await fetchProjects()
  return projects.map(p => ({ params: { slug: p.slug } }))
}

const { slug } = Astro.params
const project = await fetchProject(slug)
if (!project) return Astro.redirect('/404')
---

<BaseLayout title={project.name} description={project.description} lang="en">
  <article class="project container">
    <header>
      <p class="mono project__back"><a href="/">← Back</a></p>
      <h1 class="project__name mono">{project.name}</h1>
      {project.tagline && <p class="project__tagline">{project.tagline}</p>}
      <div class="project__meta mono">
        <span>★ {project.stars}</span>
        {project.language && <span>{project.language}</span>}
        <span>{new Date(project.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
      </div>
      <ul class="project__stack" aria-label="Stack">
        {project.stack.map(t => <li class="mono">{t}</li>)}
      </ul>
      <div class="project__links">
        <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" class="brut-btn">GitHub ↗</a>
        {project.homepage && <a href={project.homepage} target="_blank" rel="noopener noreferrer" class="brut-btn">Live demo ↗</a>}
      </div>
    </header>
    {project.screenshot && (
      <div class="project__screenshot brut-card">
        <img src={project.screenshot} alt={`${project.name} screenshot`} />
      </div>
    )}
    <div class="project__readme prose" set:html={project.readmeMarkdown} />
  </article>
</BaseLayout>

<style>
  .project { padding-block: var(--space-12); }
  .project__back { margin-bottom: var(--space-6); font-size: var(--text-sm); }
  .project__back a:hover { color: var(--color-accent); }
  .project__name { font-size: var(--text-2xl); font-weight: 700; margin-bottom: var(--space-3); }
  .project__tagline { font-size: var(--text-lg); color: var(--color-accent); font-weight: 600; margin-bottom: var(--space-4); }
  .project__meta { display: flex; gap: var(--space-6); font-size: var(--text-sm); color: var(--color-muted); margin-bottom: var(--space-4); }
  .project__stack { display: flex; flex-wrap: wrap; gap: var(--space-2); list-style: none; margin-bottom: var(--space-6); }
  .project__stack li { padding: var(--space-1) var(--space-3); border: var(--border-width) solid var(--color-border); font-size: var(--text-xs); }
  .project__links { display: flex; gap: var(--space-4); flex-wrap: wrap; margin-bottom: var(--space-8); }
  .project__screenshot { margin-bottom: var(--space-8); overflow: hidden; }
  .project__readme { max-width: 70ch; }
  .prose :global(h1), .prose :global(h2), .prose :global(h3) { font-family: var(--font-mono); margin-block: var(--space-6) var(--space-3); }
  .prose :global(p) { margin-bottom: var(--space-4); line-height: 1.7; }
  .prose :global(code) { font-family: var(--font-mono); font-size: 0.9em; background: var(--color-fg); color: var(--color-bg); padding: 0.1em 0.3em; }
  .prose :global(pre) { background: var(--color-fg); color: var(--color-bg); padding: var(--space-6); overflow-x: auto; margin-bottom: var(--space-4); border: var(--border-width) solid var(--color-border); }
  .prose :global(ul), .prose :global(ol) { margin-left: var(--space-6); margin-bottom: var(--space-4); }
  .prose :global(a) { color: var(--color-accent); text-decoration: underline; }
</style>
```

- [ ] **Step 2: Replace web/src/pages/es/projects/[slug].astro**

```astro
---
export const prerender = true
import BaseLayout from '../../../layouts/BaseLayout.astro'
import { fetchProjects, fetchProject } from '../../../lib/api'

export async function getStaticPaths() {
  const projects = await fetchProjects()
  return projects.map(p => ({ params: { slug: p.slug } }))
}

const { slug } = Astro.params
const project = await fetchProject(slug)
if (!project) return Astro.redirect('/404')
---

<BaseLayout title={project.name} description={project.description} lang="es">
  <article class="project container">
    <header>
      <p class="mono project__back"><a href="/es/">← Volver</a></p>
      <h1 class="project__name mono">{project.name}</h1>
      {project.tagline && <p class="project__tagline">{project.tagline}</p>}
      <div class="project__meta mono">
        <span>★ {project.stars}</span>
        {project.language && <span>{project.language}</span>}
        <span>{new Date(project.updatedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })}</span>
      </div>
      <ul class="project__stack" aria-label="Stack">
        {project.stack.map(t => <li class="mono">{t}</li>)}
      </ul>
      <div class="project__links">
        <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" class="brut-btn">GitHub ↗</a>
        {project.homepage && <a href={project.homepage} target="_blank" rel="noopener noreferrer" class="brut-btn">Demo ↗</a>}
      </div>
    </header>
    {project.screenshot && (
      <div class="project__screenshot brut-card">
        <img src={project.screenshot} alt={`${project.name} captura`} />
      </div>
    )}
    <div class="project__readme prose" set:html={project.readmeMarkdown} />
  </article>
</BaseLayout>

<style>
  .project { padding-block: var(--space-12); }
  .project__back { margin-bottom: var(--space-6); font-size: var(--text-sm); }
  .project__back a:hover { color: var(--color-accent); }
  .project__name { font-size: var(--text-2xl); font-weight: 700; margin-bottom: var(--space-3); }
  .project__tagline { font-size: var(--text-lg); color: var(--color-accent); font-weight: 600; margin-bottom: var(--space-4); }
  .project__meta { display: flex; gap: var(--space-6); font-size: var(--text-sm); color: var(--color-muted); margin-bottom: var(--space-4); }
  .project__stack { display: flex; flex-wrap: wrap; gap: var(--space-2); list-style: none; margin-bottom: var(--space-6); }
  .project__stack li { padding: var(--space-1) var(--space-3); border: var(--border-width) solid var(--color-border); font-size: var(--text-xs); }
  .project__links { display: flex; gap: var(--space-4); flex-wrap: wrap; margin-bottom: var(--space-8); }
  .project__screenshot { margin-bottom: var(--space-8); overflow: hidden; }
  .project__readme { max-width: 70ch; }
  .prose :global(h1), .prose :global(h2), .prose :global(h3) { font-family: var(--font-mono); margin-block: var(--space-6) var(--space-3); }
  .prose :global(p) { margin-bottom: var(--space-4); line-height: 1.7; }
  .prose :global(code) { font-family: var(--font-mono); font-size: 0.9em; background: var(--color-fg); color: var(--color-bg); padding: 0.1em 0.3em; }
  .prose :global(pre) { background: var(--color-fg); color: var(--color-bg); padding: var(--space-6); overflow-x: auto; margin-bottom: var(--space-4); border: var(--border-width) solid var(--color-border); }
  .prose :global(ul), .prose :global(ol) { margin-left: var(--space-6); margin-bottom: var(--space-4); }
  .prose :global(a) { color: var(--color-accent); text-decoration: underline; }
</style>
```

- [ ] **Step 3: Build**

```bash
cd web && bun run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/projects/ web/src/pages/es/projects/
git commit -m "feat: wire EN/ES project detail pages with full neo-brutalism layout"
```

---

### Task 23: About pages EN/ES

**Files:**
- Modify: `web/src/pages/about.astro`
- Modify: `web/src/pages/es/about.astro`

- [ ] **Step 1: Replace web/src/pages/about.astro**

```astro
---
export const prerender = true
import BaseLayout from '../layouts/BaseLayout.astro'
import { getEntry } from 'astro:content'

const about = await getEntry('about', 'en')
const { Content } = await about!.render()
---

<BaseLayout title="About" description="About me" lang="en">
  <div class="about container">
    <h1 class="about__title mono">// about</h1>
    <div class="prose about__content"><Content /></div>
  </div>
</BaseLayout>

<style>
  .about { padding-block: var(--space-section); }
  .about__title { font-size: var(--text-xl); color: var(--color-muted); margin-bottom: var(--space-8); }
  .about__content { max-width: 60ch; }
  .prose :global(h2) { font-family: var(--font-mono); font-size: var(--text-lg); margin-block: var(--space-8) var(--space-4); }
  .prose :global(p) { margin-bottom: var(--space-4); line-height: 1.7; }
  .prose :global(ul) { margin-left: var(--space-6); margin-bottom: var(--space-4); }
  .prose :global(strong) { font-weight: 700; }
  .prose :global(a) { color: var(--color-accent); text-decoration: underline; }
</style>
```

- [ ] **Step 2: Replace web/src/pages/es/about.astro**

```astro
---
export const prerender = true
import BaseLayout from '../../layouts/BaseLayout.astro'
import { getEntry } from 'astro:content'

const about = await getEntry('about', 'es')
const { Content } = await about!.render()
---

<BaseLayout title="Sobre Mí" description="Sobre mí" lang="es">
  <div class="about container">
    <h1 class="about__title mono">// sobre mí</h1>
    <div class="prose about__content"><Content /></div>
  </div>
</BaseLayout>

<style>
  .about { padding-block: var(--space-section); }
  .about__title { font-size: var(--text-xl); color: var(--color-muted); margin-bottom: var(--space-8); }
  .about__content { max-width: 60ch; }
  .prose :global(h2) { font-family: var(--font-mono); font-size: var(--text-lg); margin-block: var(--space-8) var(--space-4); }
  .prose :global(p) { margin-bottom: var(--space-4); line-height: 1.7; }
  .prose :global(ul) { margin-left: var(--space-6); margin-bottom: var(--space-4); }
  .prose :global(strong) { font-weight: 700; }
  .prose :global(a) { color: var(--color-accent); text-decoration: underline; }
</style>
```

- [ ] **Step 3: Build**

```bash
cd web && bun run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/about.astro web/src/pages/es/about.astro
git commit -m "feat: wire about pages EN/ES with MDX content"
```

---

## Phase 6 — Env Examples and Deploy Docs (PR 6)

### Task 24: Update .env.example files and CLAUDE.md

**Files:**
- Modify: `.env.example`
- Modify: `web/.env.example`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace .env.example**

```bash
# API — Hono + Bun on Render
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# GitHub — required
GITHUB_TOKEN=ghp_your_token_here
GITHUB_USERNAME=YourGitHubUsername
PORTFOLIO_TOPIC=portfolio

# Cache — optional (default 10min = 600000ms)
CACHE_TTL_MS=600000

# Revalidate — set same value in cron-job.org Authorization header
CRON_SECRET=your_secure_random_secret_here

# CORS — comma-separated allowed origins
ALLOWED_ORIGINS=https://your-portfolio.vercel.app

# Rate limiting — optional
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Set true only behind a trusted reverse proxy
TRUST_PROXY=false
```

- [ ] **Step 2: Replace web/.env.example**

```bash
# Web — Astro on Vercel
PUBLIC_API_URL=https://your-api.onrender.com
```

- [ ] **Step 3: Update CLAUDE.md stack table**

Remove rows: DB (Drizzle), Auth (Clerk)
Add rows: GitHub API (gray-matter), Cache (TtlCache in-process, 10min)
Update deploy row: Render (Bun native), Vercel (Astro hybrid ISR 600s)

- [ ] **Step 4: Update CLAUDE.md commands**

Remove: `bun run db:*`
Update architecture section: remove auth/db, add cache/github sections.

- [ ] **Step 5: Commit**

```bash
git add .env.example web/.env.example CLAUDE.md
git commit -m "docs: update env examples and CLAUDE.md for portfolio architecture"
```

---

### Task 25: DEPLOY.md

**Files:**
- Create: `DEPLOY.md`

- [ ] **Step 1: Create DEPLOY.md**

```markdown
# Deploy

## Backend — Render

1. Create new **Web Service** on Render
2. Connect repo, root dir: `.` (not `web/`)
3. Runtime: **Bun** (native — no Dockerfile needed)
4. Build command: `bun install`
5. Start command: `bun run start`
6. Set env vars:
   - `GITHUB_TOKEN` — Fine-grained PAT (read:public_repo scope only)
   - `GITHUB_USERNAME` — Your GitHub username
   - `PORTFOLIO_TOPIC` — Topic to filter repos (default: `portfolio`)
   - `CRON_SECRET` — Random secret (match in cron-job.org job)
   - `ALLOWED_ORIGINS` — Your Vercel URL: `https://your-portfolio.vercel.app`
   - `NODE_ENV=production`

## Frontend — Vercel

1. Import repo on Vercel, root dir: `web/`
2. Framework: **Astro**
3. Build command: `bun run build`
4. Output dir: `dist/`
5. Set env vars:
   - `PUBLIC_API_URL` — Your Render URL: `https://your-api.onrender.com`

## cron-job.org — Cache Warmup

1. Create free account at cron-job.org
2. New job:
   - URL: `https://your-api.onrender.com/api/revalidate`
   - Method: `POST`
   - Header: `Authorization: Bearer <CRON_SECRET>`
   - Schedule: every 10 minutes
3. Purpose: warms Hono TtlCache before Vercel ISR (600s) re-renders pages.

## GitHub Token

Generate: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained
Minimum scope: **Public Repositories (read)**

## Tagging Repos

Add topic `portfolio` to any GitHub repo you want shown.

Optional README frontmatter for overrides:

```yaml
---
tagline: Short punchy description
stack: [TypeScript, Hono, Astro]
screenshot: https://your-screenshot.png
featured: true
order: 1
---
```
```

- [ ] **Step 2: Commit**

```bash
git add DEPLOY.md
git commit -m "docs: add DEPLOY.md for Render, Vercel, and cron-job.org"
```

---

## Phase 7 — E2E Tests (PR 7)

### Task 26: Playwright E2E tests

**Files:**
- Create: `e2e/portfolio.spec.ts`

- [ ] **Step 1: Create e2e/portfolio.spec.ts**

```typescript
import { test, expect } from '@playwright/test'

test.describe('EN home page', () => {
  test('loads and shows heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('nav')).toBeVisible()
  })

  test('nav brand links to home', async ({ page }) => {
    await page.goto('/')
    const brand = page.locator('.nav__brand')
    await expect(brand).toContainText('portfolio')
    await brand.click()
    await expect(page).toHaveURL('/')
  })

  test('lang switcher navigates to ES', async ({ page }) => {
    await page.goto('/')
    await page.locator('.nav__lang').click()
    await expect(page).toHaveURL('/es/')
  })
})

test.describe('ES home page', () => {
  test('loads with Spanish content', async ({ page }) => {
    await page.goto('/es/')
    await expect(page.locator('h1')).toContainText('Construyo')
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  })

  test('lang switcher navigates back to EN', async ({ page }) => {
    await page.goto('/es/')
    await page.locator('.nav__lang').click()
    await expect(page).toHaveURL('/')
  })
})

test.describe('About pages', () => {
  test('EN about loads', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('ES about loads', async ({ page }) => {
    await page.goto('/es/about')
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  })
})

test.describe('API health', () => {
  test('/health returns 200', async ({ request }) => {
    const res = await request.get('http://localhost:3000/health')
    expect(res.ok()).toBe(true)
  })
})
```

- [ ] **Step 2: Run E2E (both servers must be running)**

```bash
# Terminal 1: bun run dev         (API on :3000)
# Terminal 2: cd web && bun run dev  (Astro on :4321)
bun run test:e2e
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/portfolio.spec.ts
git commit -m "test: add E2E specs for EN/ES home, about, lang switcher, API health"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task(s) |
|-------------|---------|
| Strip Clerk/Drizzle/libsql | 1–8 |
| GitHub API filtered by topic | 10, 11 |
| gray-matter README parsing | 11 |
| TtlCache in-process | 9 |
| /projects + /projects/:slug | 12 |
| /api/revalidate + timing-safe | 13 |
| Astro Vercel adapter + ISR 600s | 14 |
| Content collections | 15 |
| Route stubs + API client | 16 |
| Design tokens neo-brutalism | 17 |
| ProjectCard component | 18 |
| BaseLayout + Nav + lang switcher | 19 |
| EN home wired | 20 |
| ES home wired | 21 |
| Project detail EN/ES | 22 |
| About EN/ES with MDX | 23 |
| .env.example + CLAUDE.md updated | 24 |
| Deploy docs | 25 |
| E2E tests | 26 |
| cron-job.org setup | 25 (DEPLOY.md) |

### Type consistency

- `Project` interface: `src/lib/project.ts` (Task 11) → mirrored in `web/src/lib/api.ts` (Task 16)
- `GithubRepo`: `src/lib/githubClient.ts` (Task 10) → used in `projectAggregator.ts` (Task 11)
- `TtlCache<Project[]>`: generic from Task 9, instantiated in Task 12
- `projectsCache`: exported from `src/routes/projects.ts` (Task 12), imported in `src/routes/revalidate.ts` (Task 13)

### No placeholders found. All tasks have complete code.
