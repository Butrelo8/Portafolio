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
import { errorHandler } from '../../src/middleware/error'

app.onError(errorHandler)

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
