import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { healthRoute } from '../src/routes/health';

describe('health', () => {
  it('returns ok + version + uptime', async () => {
    const app = new Hono();
    app.route('/health', healthRoute());
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      version: string;
      uptimeSeconds: number;
    };
    expect(body.status).toBe('ok');
    expect(typeof body.version).toBe('string');
    expect(typeof body.uptimeSeconds).toBe('number');
  });
});
