// Build-time GitHub fetch. Runs during `astro build` only — the site is
// `output: 'static'`, so no request ever hits GitHub from a visitor's browser.
import matter from 'gray-matter';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

export interface Project {
  slug: string;
  name: string;
  description: string;
  tagline: string | null;
  stack: string[];
  language: string | null;
  stars: number;
  homepage: string | null;
  repoUrl: string;
  screenshot: string | null;
  readmeHtml: string;
  featured: boolean;
  order: number | null;
  updatedAt: string;
}

interface GithubRepo {
  name: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  html_url: string;
  topics: string[];
  pushed_at: string;
}

interface ReadmeFrontmatter {
  tagline?: string;
  stack?: string[];
  screenshot?: string;
  featured?: boolean;
  order?: number;
}

const API = 'https://api.github.com';

// .env values arrive via import.meta.env (Vite); CI secrets via process.env.
const ENV: Record<string, string | undefined> = { ...process.env, ...import.meta.env };

function config() {
  const token = ENV.GITHUB_TOKEN;
  const username = ENV.GITHUB_USERNAME;
  if (!token || !username) {
    throw new Error('GITHUB_TOKEN and GITHUB_USERNAME are required at build time');
  }
  return {
    username,
    topic: ENV.PORTFOLIO_TOPIC ?? 'portfolio',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      // GitHub rejects requests without a User-Agent (403).
      'User-Agent': 'mi-portafolio',
    },
  };
}

async function getReadme(username: string, repo: string, headers: Record<string, string>) {
  const res = await fetch(`${API}/repos/${username}/${repo}/readme`, { headers });
  if (!res.ok) return null;
  const data = (await res.json()) as { content: string };
  return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
}

async function toProject(repo: GithubRepo, readme: string | null): Promise<Project> {
  const { data, content } = matter(readme ?? '');
  const fm = data as ReadmeFrontmatter;

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
    readmeHtml: sanitizeHtml(await marked.parse(content.trim())),
    featured: fm.featured ?? false,
    order: fm.order ?? null,
    updatedAt: repo.pushed_at,
  };
}

async function build(): Promise<Project[]> {
  const { username, topic, headers } = config();
  const res = await fetch(`${API}/users/${username}/repos?per_page=100&sort=updated&type=public`, {
    headers,
  });
  if (!res.ok) throw new Error(`GitHub listRepos failed: ${res.status}`);

  const repos = ((await res.json()) as GithubRepo[]).filter((r) => r.topics.includes(topic));
  const projects = await Promise.all(
    repos.map(async (r) => toProject(r, await getReadme(username, r.name, headers))),
  );

  return projects.sort((a, b) => {
    if (a.order !== null && b.order !== null) return a.order - b.order;
    if (a.order !== null) return -1;
    if (b.order !== null) return 1;
    return b.stars - a.stars;
  });
}

// Every page imports this; memoize so one build = one pass over the GitHub API.
let cached: Promise<Project[]> | null = null;

export function fetchProjects(): Promise<Project[]> {
  cached ??= build();
  return cached;
}

export async function fetchProject(slug: string): Promise<Project | null> {
  return (await fetchProjects()).find((p) => p.slug === slug) ?? null;
}
