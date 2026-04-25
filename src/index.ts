import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from './env';
import { buildCorsConfig } from './lib/corsOrigins';
import { createShutdownManager } from './lib/gracefulShutdown';
import { bodyLimit } from './middleware/bodyLimit';
import { errorHandler } from './middleware/error';
import { httpsRedirect } from './middleware/https';
import { clientIp, createRateLimit } from './middleware/rateLimitFactory';
import { createHealthRateLimit } from './middleware/rateLimitHealth';
import { logger, requestLogger } from './middleware/requestLogger';
import { security } from './middleware/security';
import { mountRoutes } from './routes';

/** Assigned in `Bun.serve`; request handlers run only after listen, so `requestIP` is valid for live traffic. */
let bunServer: ReturnType<typeof Bun.serve>;

const app = new Hono();
const shutdown = createShutdownManager();

app.onError(errorHandler);

app.use('*', security);
app.use('*', httpsRedirect(env.NODE_ENV === 'production'));
app.use('*', requestLogger);
app.use('*', async (c, next) => {
  const ip = bunServer.requestIP(c.req.raw);
  c.set('socketIp', ip?.address ?? 'unknown');
  await next();
});

const globalLimiter = createRateLimit({
  max: env.RATE_LIMIT_MAX,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  keyFn: clientIp,
});
shutdown.register(globalLimiter.dispose);
app.use('*', globalLimiter.middleware);

const healthLimiter = createHealthRateLimit();
shutdown.register(healthLimiter.dispose);
app.use('/health', healthLimiter.middleware);

app.use('*', cors(buildCorsConfig(env.ALLOWED_ORIGINS.split(',').map(s => s.trim()))));
app.use('*', bodyLimit());

app.route('/', mountRoutes());

shutdown.attachSignals();

bunServer = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

logger.info({ msg: 'server_started', port: env.PORT, env: env.NODE_ENV });

shutdown.register(async () => {
  bunServer.stop();
});
