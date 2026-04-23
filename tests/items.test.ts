import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { errorHandler } from '../src/middleware/error';
import { requestLogger } from '../src/middleware/requestLogger';
import { itemsRoute } from '../src/routes/items';

const fakeAuth = {
  verify: async (t: string) => (t === 'good' ? { userId: 'u1', sessionId: 's1' } : null),
};

describe('items CRUD', () => {
  it('rejects unauthenticated', async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.use('*', requestLogger);
    app.route('/items', itemsRoute({ verify: fakeAuth.verify }));
    const res = await app.request('/items');
    expect(res.status).toBe(401);
  });

  it('lists items for authed user', async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.use('*', requestLogger);
    app.route('/items', itemsRoute({ verify: fakeAuth.verify }));
    const res = await app.request('/items', { headers: { Authorization: 'Bearer good' } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
  });
});
