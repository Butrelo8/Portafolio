import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { requireAuth } from '../src/middleware/auth';

describe('requireAuth', () => {
  it('rejects missing Authorization', async () => {
    const app = new Hono();
    app.use('*', requireAuth({ verify: async () => null }));
    app.get('/', (c) => c.text('ok'));
    const res = await app.request('/');
    expect(res.status).toBe(401);
  });

  it('sets userId on valid token', async () => {
    const app = new Hono();
    app.use('*', requireAuth({ verify: async (t) => (t === 'good' ? { userId: 'u1', sessionId: 's1' } : null) }));
    app.get('/', (c) => c.text(c.get('userId')));
    const res = await app.request('/', { headers: { Authorization: 'Bearer good' } });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('u1');
  });
});
