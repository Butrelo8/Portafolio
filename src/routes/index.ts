import { Hono } from 'hono'
import { healthRoute } from './health'

export function mountRoutes(): Hono {
  const app = new Hono()
  app.route('/health', healthRoute())
  return app
}
