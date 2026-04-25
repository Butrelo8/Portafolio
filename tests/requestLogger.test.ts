import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { requestLogger } from '../src/middleware/requestLogger';

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('requestLogger', () => {
  it('always sets server x-request-id; response does not echo client-supplied id', async () => {
    const app = new Hono();
    app.use('*', requestLogger);
    app.get('/', (c) => c.json({ requestId: c.get('requestId'), traceId: c.get('traceId') }));

    const res = await app.request('/', {
      headers: { 'x-request-id': 'client-controlled-id' },
    });
    const headerId = res.headers.get('x-request-id');
    if (headerId === null) throw new Error('expected x-request-id header');
    expect(headerId).toMatch(uuidRe);
    expect(headerId).not.toBe('client-controlled-id');
    const body = (await res.json()) as { requestId: string; traceId: string };
    expect(body.requestId).toBe(headerId);
    expect(body.traceId).toBe(headerId);
  });

  it('access log JSON line includes traceId matching x-request-id', async () => {
    const lines: string[] = [];
    const orig = console.log;
    console.log = (msg: unknown) => {
      lines.push(String(msg));
    };
    try {
      const app = new Hono();
      app.use('*', requestLogger);
      app.get('/a', (c) => c.text('ok'));
      const res = await app.request('/a');
      expect(res.status).toBe(200);
      const headerId = res.headers.get('x-request-id');
      if (headerId === null) throw new Error('expected x-request-id');
      const access = lines
        .map((l) => {
          try {
            return JSON.parse(l) as { msg?: string; traceId?: string; clientIp?: string };
          } catch {
            return null;
          }
        })
        .find((x) => x?.msg === 'request');
      expect(access?.traceId).toBe(headerId);
      expect(access?.clientIp).toBe('unknown');
    } finally {
      console.log = orig;
    }
  });

  it('access log includes clientIp from socketIp when middleware sets it before requestLogger', async () => {
    const lines: string[] = [];
    const orig = console.log;
    console.log = (msg: unknown) => {
      lines.push(String(msg));
    };
    try {
      const app = new Hono();
      app.use('*', async (c, next) => {
        c.set('socketIp', '192.0.2.10');
        await next();
      });
      app.use('*', requestLogger);
      app.get('/b', (c) => c.text('ok'));
      const res = await app.request('/b', { headers: { 'x-forwarded-for': '6.6.6.6' } });
      expect(res.status).toBe(200);
      const access = lines
        .map((l) => {
          try {
            return JSON.parse(l) as { msg?: string; clientIp?: string };
          } catch {
            return null;
          }
        })
        .find((x) => x?.msg === 'request');
      expect(access?.clientIp).toBe('192.0.2.10');
    } finally {
      console.log = orig;
    }
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
