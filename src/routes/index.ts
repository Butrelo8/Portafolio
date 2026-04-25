import { Hono } from 'hono';
import { healthRoute } from './health';
import projects from './projects';
import revalidate from './revalidate';

export function mountRoutes(): Hono {
  const app = new Hono();
  app.route('/health', healthRoute());
  app.route('/', projects);
  app.route('/', revalidate);
  return app;
}
