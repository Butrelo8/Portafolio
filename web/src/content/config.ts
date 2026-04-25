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
