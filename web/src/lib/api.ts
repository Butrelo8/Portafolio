export function getPublicApiUrl(): string {
  const url = import.meta.env.PUBLIC_API_URL;
  if (!url) throw new Error('PUBLIC_API_URL is not configured');
  return url.replace(/\/$/, '');
}

export async function apiFetch(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<Response> {
  const { token, headers, ...rest } = init;
  const h = new Headers(headers);
  if (token) h.set('Authorization', `Bearer ${token}`);
  h.set('Accept', 'application/json');
  return fetch(`${getPublicApiUrl()}${path}`, { ...rest, headers: h });
}

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
  const res = await apiFetch('/projects')
  if (!res.ok) throw new Error(`fetchProjects failed: ${res.status}`)
  const body: { success: boolean; data: Project[] } = await res.json()
  return body.data
}

export async function fetchProject(slug: string): Promise<Project | null> {
  const res = await apiFetch(`/projects/${slug}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`fetchProject failed: ${res.status}`)
  const body: { success: boolean; data: Project } = await res.json()
  return body.data
}
