import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  ALLOWED_ORIGINS: z
    .string()
    .min(1)
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  /** Required once you add Resend email send routes; omit or leave unset until then. */
  RESEND_API_KEY: z.preprocess(
    (v) =>
      v === undefined || v === null || String(v).trim() === '' ? undefined : String(v).trim(),
    z.string().min(1).optional(),
  ),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  /** When true, rate-limit `clientIp` uses `x-forwarded-for` / `x-real-ip` (set only behind a trusted reverse proxy). */
  TRUST_PROXY: z
    .preprocess((v) => {
      if (typeof v === 'boolean') return v;
      const s = v === undefined || v === null ? '' : String(v).trim().toLowerCase();
      if (s === '' || s === '0' || s === 'false' || s === 'no') return false;
      if (s === '1' || s === 'true' || s === 'yes') return true;
      return false;
    }, z.boolean())
    .default(false),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(raw: NodeJS.ProcessEnv | Record<string, string | undefined>): Env {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ');
    throw new Error(`Invalid environment:\n  ${issues}`);
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);
