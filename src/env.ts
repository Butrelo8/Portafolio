import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_USERNAME: z.string().min(1),
  PORTFOLIO_TOPIC: z.string().default('portfolio'),
  CACHE_TTL_MS: z.coerce.number().default(600_000),
  CRON_SECRET: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default('*'),
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
})

export const env = schema.parse(process.env)
export type Env = z.infer<typeof schema>
