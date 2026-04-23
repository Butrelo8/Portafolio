import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { z } from 'zod';
import { errorHandler } from '../src/middleware/error';
import { requestLogger } from '../src/middleware/requestLogger';
import { validate } from '../src/middleware/validate';

describe('validate', () => {
  it('rejects invalid json', async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.use('*', requestLogger);
    app.post('/', validate({ json: z.object({ name: z.string().min(1) }) }), (c) =>
      c.json({ ok: true }),
    );
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('exposes parsed data', async () => {
    const app = new Hono();
    app.get('/', validate({ query: z.object({ n: z.coerce.number() }) }), (c) => {
      const q = c.get('validated').query as { n: number };
      return c.json({ n: q.n });
    });
    const res = await app.request('/?n=5');
    expect(await res.json()).toEqual({ n: 5 });
  });
});
