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
