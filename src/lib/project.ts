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
