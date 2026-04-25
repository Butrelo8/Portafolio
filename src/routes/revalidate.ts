import { Hono } from 'hono'
import { timingSafeEqual } from 'crypto'
import { env } from '../env'
import { projectsCache } from './projects'

function safeCompare(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab) // consume time even on length mismatch
    return false
  }
  return timingSafeEqual(ab, bb)
}

const app = new Hono()

app.post('/api/revalidate', async (c) => {
  const secret = env.CRON_SECRET
  if (!secret) {
    return c.json({ success: false, error: 'Revalidate endpoint not configured' }, 403)
  }

  const auth = c.req.header('Authorization') ?? ''
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : ''

  if (!safeCompare(secret, provided)) {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }

  projectsCache.clear()
  return c.json({ success: true, revalidated: true })
})

export default app
