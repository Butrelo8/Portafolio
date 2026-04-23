import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { requestLogger } from '../src/middleware/requestLogger';

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('requestLogger', () => {
  it('always sets server x-request-id; response does not echo client-supplied id', async () => {
    const app = new Hono();
    app.use('*', requestLogger);
    app.get('/', (c) => c.json({ requestId: c.get('requestId') }));

    const res = await app.request('/', {
      headers: { 'x-request-id': 'client-controlled-id' },
    });
    const headerId = res.headers.get('x-request-id');
    if (headerId === null) throw new Error('expected x-request-id header');
    expect(headerId).toMatch(uuidRe);
    expect(headerId).not.toBe('client-controlled-id');
    const body = (await res.json()) as { requestId: string };
    expect(body.requestId).toBe(headerId);
  });

  it('does not set clientRequestId when header missing or whitespace-only', async () => {
    const app = new Hono();
    app.use('*', requestLogger);
    app.get('/', (c) => c.json({ client: c.get('clientRequestId') ?? null }));

    const missing = await app.request('/');
    expect(((await missing.json()) as { client: string | null }).client).toBeNull();

    const blank = await app.request('/', { headers: { 'x-request-id': '   \t  ' } });
    expect(((await blank.json()) as { client: string | null }).client).toBeNull();
  });

  it('stores trimmed client id on context when header non-empty', async () => {
    const app = new Hono();
    app.use('*', requestLogger);
    app.get('/', (c) => c.json({ client: c.get('clientRequestId') ?? null }));

    const res = await app.request('/', {
      headers: { 'x-request-id': '  upstream-trace-1  ' },
    });
    expect(((await res.json()) as { client: string | null }).client).toBe('upstream-trace-1');
  });
});
