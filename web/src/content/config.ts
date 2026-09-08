import { defineCollection, z } from 'astro:content';

const projectsCollection = defineCollection({
  type: 'content',
  // image() lets Astro optimise screenshots at build time (webp, responsive widths).
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      client: z.string(),
      year: z.number(),
      // One line a prospective client understands without reading further.
      tagline: z.string(),
      // Card blurb. Longer than the tagline, shorter than the case study.
      summary: z.string(),
      stack: z.array(z.string()).default([]),
      liveUrl: z.string().url().optional(),
      repoUrl: z.string().url().optional(),
      screenshot: image().optional(),
      // Screen recording, served from public/demos/. Video is the one asset that does NOT go
      // through astro:assets — it cannot optimise video, so public/ is correct here. Encode it
      // small before committing; nothing downsizes it at build time. The screenshot above is
      // used as the poster frame, so a project with a demo wants both.
      demo: z
        .string()
        .regex(/^\/demos\/.+\.(mp4|webm)$/)
        .optional(),
      demoCaption: z.string().optional(),
      // Real quotes only. Leave the whole block out until one exists.
      testimonial: z
        .object({
          quote: z.string(),
          author: z.string(),
          role: z.string(),
        })
        .optional(),
      featured: z.boolean().default(false),
      order: z.number(),
    }),
});

const aboutCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
  }),
});

export const collections = {
  projects: projectsCollection,
  about: aboutCollection,
};
