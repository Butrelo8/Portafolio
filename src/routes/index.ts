import { Hono } from 'hono';
import type { AuthOptions } from '../middleware/auth';
import { healthRoute } from './health';
import { itemsRoute } from './items';

export function mountRoutes(auth: AuthOptions): Hono {
  const app = new Hono();
  app.route('/health', healthRoute());
  app.route('/items', itemsRoute(auth));
  return app;
}
