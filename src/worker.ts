import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from './env';
import { buildCorsConfig } from './lib/corsOrigins';
import { bodyLimit } from './middleware/bodyLimit';
import { errorHandler } from './middleware/error';
import { requestLogger } from './middleware/requestLogger';
import { security } from './middleware/security';
import { mountRoutes } from './routes';

// ponytail: Workers entry. Drops Bun.serve, graceful shutdown, httpsRedirect (Cloudflare
// terminates TLS) and the in-process rate limiters — per-isolate buckets are meaningless on
// Workers; use a Cloudflare rate-limiting rule instead if the edge defaults ever fall short.
const app = new Hono();

app.onError(errorHandler);

app.use('*', security);
app.use('*', requestLogger);
app.use('*', async (c, next) => {
  c.set('socketIp', c.req.header('cf-connecting-ip') ?? 'unknown');
  await next();
});
app.use('*', cors(buildCorsConfig(env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()))));
app.use('*', bodyLimit());

app.route('/', mountRoutes());

export default app;
