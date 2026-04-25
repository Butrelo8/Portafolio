import { Hono } from 'hono';
import { healthRoute } from './health';
import projects from './projects';

export function mountRoutes(): Hono {
  const app = new Hono();
  app.route('/health', healthRoute());
  app.route('/', projects);
  return app;
}
