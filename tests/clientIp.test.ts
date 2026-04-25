import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { resolveClientIp } from '../src/lib/clientIp';

describe('resolveClientIp', () => {
  it('TRUST_PROXY=false uses socketIp; ignores spoofed X-Forwarded-For', async () => {
    const app = new Hono();
    app.use('*', async (c, next) => {
      c.set('socketIp', '10.0.0.1');
      await next();
    });
    app.get('/', (c) => c.text(resolveClientIp(c, false)));

    const res = await app.request('/', { headers: { 'x-forwarded-for': '1.1.1.1' } });
    expect(await res.text()).toBe('10.0.0.1');
  });

  it('TRUST_PROXY=true uses first X-Forwarded-For hop', async () => {
    const app = new Hono();
    app.use('*', async (c, next) => {
      c.set('socketIp', '10.0.0.1');
      await next();
    });
    app.get('/', (c) => c.text(resolveClientIp(c, true)));

    const res = await app.request('/', { headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.2' } });
    expect(await res.text()).toBe('203.0.113.1');
  });

  it('TRUST_PROXY=true falls back to x-real-ip when no forwarded header', async () => {
    const app = new Hono();
    app.get('/', (c) => c.text(resolveClientIp(c, true)));
    const res = await app.request('/', { headers: { 'x-real-ip': '198.51.100.5' } });
    expect(await res.text()).toBe('198.51.100.5');
  });
});
