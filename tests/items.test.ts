import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import type { AuthOptions } from '../src/middleware/auth';
import { errorHandler } from '../src/middleware/error';
import { requestLogger } from '../src/middleware/requestLogger';
import { itemsRoute } from '../src/routes/items';

const fakeAuth: AuthOptions = {
  verify: async (t: string) => (t === 'good' ? { userId: 'u1', sessionId: 's1' } : null),
};

const fakeAuthU2: AuthOptions = {
  verify: async (t: string) => (t === 'good2' ? { userId: 'u2', sessionId: 's2' } : null),
};

function buildItemsApp(auth: AuthOptions): Hono {
  const app = new Hono();
  app.onError(errorHandler);
  app.use('*', requestLogger);
  app.route('/items', itemsRoute(auth));
  return app;
}

describe('items CRUD', () => {
  it('rejects unauthenticated', async () => {
    const app = buildItemsApp(fakeAuth);
    const res = await app.request('/items');
    expect(res.status).toBe(401);
  });

  it('lists items for authed user', async () => {
    const app = buildItemsApp(fakeAuth);
    const res = await app.request('/items', { headers: { Authorization: 'Bearer good' } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[]; nextCursor: string | null };
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.nextCursor === null || typeof body.nextCursor === 'string').toBe(true);
  });

  it('paginates with limit and cursor', async () => {
    const ownerId = `u-page-${crypto.randomUUID()}`;
    const auth: AuthOptions = {
      verify: async (t: string) => (t === 'good' ? { userId: ownerId, sessionId: 's1' } : null),
    };
    const app = buildItemsApp(auth);

    const headers = { Authorization: 'Bearer good', 'Content-Type': 'application/json' };
    const c1 = await app.request('/items', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'page-a' }),
    });
    const c2 = await app.request('/items', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'page-b' }),
    });
    expect(c1.status).toBe(201);
    expect(c2.status).toBe(201);
    const id1 = ((await c1.json()) as { item: { id: string } }).item.id;
    const id2 = ((await c2.json()) as { item: { id: string } }).item.id;
    const sortedIds = [id1, id2].sort() as [string, string];

    const first = await app.request('/items?limit=1', {
      headers: { Authorization: 'Bearer good' },
    });
    expect(first.status).toBe(200);
    const p1 = (await first.json()) as { items: { id: string }[]; nextCursor: string | null };
    expect(p1.items).toHaveLength(1);
    expect(p1.items[0]?.id).toBe(sortedIds[0]);
    expect(p1.nextCursor).toBe(sortedIds[0]);

    const second = await app.request(
      `/items?limit=1&cursor=${encodeURIComponent(p1.nextCursor ?? '')}`,
      {
        headers: { Authorization: 'Bearer good' },
      },
    );
    expect(second.status).toBe(200);
    const p2 = (await second.json()) as { items: { id: string }[]; nextCursor: string | null };
    expect(p2.items).toHaveLength(1);
    expect(p2.items[0]?.id).toBe(sortedIds[1]);
    expect(p2.nextCursor).toBeNull();
  });

  it('creates item', async () => {
    const app = buildItemsApp(fakeAuth);
    const res = await app.request('/items', {
      method: 'POST',
      headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test item' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { item: { id: string; name: string } };
    expect(body.item.name).toBe('test item');
  });

  it('owner isolation — u2 cannot read u1 item', async () => {
    const app1 = buildItemsApp(fakeAuth);
    const create = await app1.request('/items', {
      method: 'POST',
      headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'private' }),
    });
    expect(create.status).toBe(201);
    const { item } = (await create.json()) as { item: { id: string } };

    const app2 = buildItemsApp(fakeAuthU2);
    const res = await app2.request(`/items/${item.id}`, {
      headers: { Authorization: 'Bearer good2' },
    });
    expect(res.status).toBe(404);
  });

  it('patch returns 404 for unknown id', async () => {
    const app = buildItemsApp(fakeAuth);
    const res = await app.request('/items/00000000-0000-0000-0000-000000000000', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    });
    expect(res.status).toBe(404);
  });

  it('delete returns 404 for unknown id', async () => {
    const app = buildItemsApp(fakeAuth);
    const res = await app.request('/items/00000000-0000-0000-0000-000000000000', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer good' },
    });
    expect(res.status).toBe(404);
  });

  it('post rejects empty name', async () => {
    const app = buildItemsApp(fakeAuth);
    const res = await app.request('/items', {
      method: 'POST',
      headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('patches item', async () => {
    const app = buildItemsApp(fakeAuth);
    const create = await app.request('/items', {
      method: 'POST',
      headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'before' }),
    });
    const { item } = (await create.json()) as { item: { id: string } };

    const patch = await app.request(`/items/${item.id}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'after' }),
    });
    expect(patch.status).toBe(200);
    const updated = (await patch.json()) as { item: { name: string } };
    expect(updated.item.name).toBe('after');
  });

  it('deletes item', async () => {
    const app = buildItemsApp(fakeAuth);
    const create = await app.request('/items', {
      method: 'POST',
      headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'to-delete' }),
    });
    const { item } = (await create.json()) as { item: { id: string } };

    const del = await app.request(`/items/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer good' },
    });
    expect(del.status).toBe(200);

    const get = await app.request(`/items/${item.id}`, {
      headers: { Authorization: 'Bearer good' },
    });
    expect(get.status).toBe(404);
  });

  it('owner isolation — u2 cannot patch u1 item', async () => {
    const app1 = buildItemsApp(fakeAuth);
    const create = await app1.request('/items', {
      method: 'POST',
      headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'u1-only' }),
    });
    const { item } = (await create.json()) as { item: { id: string } };

    const app2 = buildItemsApp(fakeAuthU2);
    const res = await app2.request(`/items/${item.id}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer good2', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'hacked' }),
    });
    expect(res.status).toBe(404);
  });

  it('owner isolation — u2 cannot delete u1 item', async () => {
    const app1 = buildItemsApp(fakeAuth);
    const create = await app1.request('/items', {
      method: 'POST',
      headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'u1-only-del' }),
    });
    const { item } = (await create.json()) as { item: { id: string } };

    const app2 = buildItemsApp(fakeAuthU2);
    const res = await app2.request(`/items/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer good2' },
    });
    expect(res.status).toBe(404);

    const stillThere = await app1.request(`/items/${item.id}`, {
      headers: { Authorization: 'Bearer good' },
    });
    expect(stillThere.status).toBe(200);
  });
});
