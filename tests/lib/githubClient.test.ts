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
      json: async () => [
        {
          name: 'my-app',
          topics: ['portfolio'],
          description: 'A cool app',
          homepage: null,
          language: 'TypeScript',
          stargazers_count: 42,
          html_url: 'https://github.com/testuser/my-app',
          pushed_at: '2024-01-01T00:00:00Z',
        },
      ],
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
        {
          name: 'a',
          topics: ['portfolio'],
          description: null,
          homepage: null,
          language: null,
          stargazers_count: 0,
          html_url: '',
          pushed_at: '',
        },
        {
          name: 'b',
          topics: ['other'],
          description: null,
          homepage: null,
          language: null,
          stargazers_count: 0,
          html_url: '',
          pushed_at: '',
        },
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
