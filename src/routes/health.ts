import { Hono } from 'hono';
import { appVersion } from '../lib/appVersion';

// ponytail: lazy init — Date.now() at global scope returns 0 on Workers.
let startedAt = 0;

export function healthRoute(): Hono {
  const app = new Hono();
  app.get('/', (c) => {
    if (startedAt === 0) startedAt = Date.now();
    return c.json({
      status: 'ok',
      version: appVersion,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      time: new Date().toISOString(),
    });
  });
  return app;
}
