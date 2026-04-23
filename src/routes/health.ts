import { Hono } from 'hono';
import { appVersion } from '../lib/appVersion';

const startedAt = Date.now();

export function healthRoute(): Hono {
  const app = new Hono();
  app.get('/', (c) =>
    c.json({
      status: 'ok',
      version: appVersion,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      time: new Date().toISOString(),
    }),
  );
  return app;
}
