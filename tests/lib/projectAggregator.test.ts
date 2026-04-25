import { describe, expect, test, mock, beforeEach } from 'bun:test'
import type { GithubRepo } from '../../src/lib/githubClient'

const mockListRepos = mock(async () => [] as GithubRepo[])
const mockGetReadme = mock(async () => null as string | null)

const mockClient = {
  listRepos: mockListRepos,
  getReadme: mockGetReadme,
}

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
  beforeEach(() => {
    mockListRepos.mockClear()
    mockGetReadme.mockClear()
  })

  test('builds project from repo with no README frontmatter', async () => {
    mockListRepos.mockResolvedValueOnce([baseRepo])
    mockGetReadme.mockResolvedValueOnce('# My App\nContent here.')

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
    mockListRepos.mockResolvedValueOnce([baseRepo])
    mockGetReadme.mockResolvedValueOnce(
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
    mockListRepos.mockResolvedValueOnce([baseRepo])
    mockGetReadme.mockResolvedValueOnce(null)

    const projects = await buildProjects(mockClient as any, 'portfolio')
    expect(projects[0]!.readmeMarkdown).toBe('')
  })

  test('returns empty array when no portfolio repos', async () => {
    mockListRepos.mockResolvedValueOnce([])
    const projects = await buildProjects(mockClient as any, 'portfolio')
    expect(projects).toHaveLength(0)
  })

  test('sorts by order first, then stars descending', async () => {
    const repos: GithubRepo[] = [
      { ...baseRepo, name: 'c', stargazers_count: 100, pushed_at: '' },
      { ...baseRepo, name: 'a', stargazers_count: 10, pushed_at: '' },
      { ...baseRepo, name: 'b', stargazers_count: 50, pushed_at: '' },
    ]
    mockListRepos.mockResolvedValueOnce(repos)
    // c has order:1, a and b have no order
    mockGetReadme
      .mockResolvedValueOnce('---\norder: 1\n---\n# C')  // c
      .mockResolvedValueOnce('# A')                       // a
      .mockResolvedValueOnce('# B')                       // b

    const projects = await buildProjects(mockClient as any, 'portfolio')
    // c has order:1 → first, then b(50 stars) > a(10 stars)
    expect(projects[0]!.name).toBe('c')
    expect(projects[1]!.name).toBe('b')
    expect(projects[2]!.name).toBe('a')
  })
})
