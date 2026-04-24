import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { AppError, toErrorResponse } from '../src/lib/errors';
import { errorHandler } from '../src/middleware/error';
import { requestLogger } from '../src/middleware/requestLogger';

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('AppError', () => {
  it('encodes envelope', () => {
    const err = new AppError('NOT_FOUND', 'Item missing', 404);
    expect(toErrorResponse(err)).toEqual({
      error: { code: 'NOT_FOUND', message: 'Item missing', status: 404 },
    });
  });

  it('wraps unknown errors as internal', () => {
    const res = toErrorResponse(new Error('boom'));
    expect(res.error.code).toBe('INTERNAL');
    expect(res.error.status).toBe(500);
  });
});

describe('errorHandler traceId', () => {
  it('unhandled error log line includes traceId matching x-request-id', async () => {
    const lines: string[] = [];
    const origErr = console.error;
    console.error = (msg: unknown) => {
      lines.push(String(msg));
    };
    try {
      const app = new Hono();
      app.onError(errorHandler);
      app.use('*', requestLogger);
      app.get('/boom', () => {
        throw new Error('intentional');
      });
      const res = await app.request('/boom');
      expect(res.status).toBe(500);
      const headerId = res.headers.get('x-request-id');
      if (headerId === null) throw new Error('expected x-request-id');
      const unhandled = lines
        .map((l) => {
          try {
            return JSON.parse(l) as { msg?: string; traceId?: string };
          } catch {
            return null;
          }
        })
        .find((x) => x?.msg === 'unhandled_error');
      expect(unhandled?.traceId).toBe(headerId);
      expect(unhandled?.traceId).toMatch(uuidRe);
    } finally {
      console.error = origErr;
    }
  });
});
