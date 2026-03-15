import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { errorHandler } from './middleware/error'
import { routes } from './routes'

const app = new Hono()

// ─── Global Middleware ────────────────────────────────
app.use('*', logger())
app.use('*', cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
  credentials: true,
}))

// ─── Routes ───────────────────────────────────────────
app.route('/api', routes)

// ─── Health Check ─────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', version: '0.1.0' }))

// ─── Error Handler ────────────────────────────────────
app.onError(errorHandler)

export default {
  port: process.env.PORT ?? 3000,
  fetch: app.fetch,
}
