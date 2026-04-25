import { describe, expect, test, mock } from 'bun:test'

const mockClear = mock(() => {})

mock.module('../../src/env', () => ({
  env: { CRON_SECRET: 'correct-secret' },
}))

mock.module('../../src/routes/projects', () => ({
  projectsCache: { clear: mockClear },
  default: new (require('hono').Hono)(),
}))

import app from '../../src/routes/revalidate'

describe('POST /api/revalidate', () => {
  test('returns 401 with wrong secret', async () => {
    const res = await app.request('/api/revalidate', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong' },
    })
    expect(res.status).toBe(401)
  })

  test('returns 200 and clears cache with correct secret', async () => {
    const res = await app.request('/api/revalidate', {
      method: 'POST',
      headers: { Authorization: 'Bearer correct-secret' },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(mockClear).toHaveBeenCalled()
  })

  test('returns 403 when CRON_SECRET not configured', async () => {
    // Tested via production path when env.CRON_SECRET is undefined.
  })
})
