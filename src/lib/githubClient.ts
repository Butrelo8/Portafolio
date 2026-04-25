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
