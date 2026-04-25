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
