import type { MiddlewareHandler } from 'hono';
import { AppError, toErrorResponse } from '../lib/errors';

const DEFAULT_LIMIT = 100 * 1024;

export function bodyLimit(maxBytes: number = DEFAULT_LIMIT): MiddlewareHandler {
  return async (c, next) => {
    const contentLength = c.req.header('content-length');
    if (contentLength && Number(contentLength) > maxBytes) {
      return c.json(
        toErrorResponse(new AppError('PAYLOAD_TOO_LARGE', `Body exceeds ${maxBytes} bytes`, 413)),
        413,
      );
    }
    const body = c.req.raw.body;
    if (body) {
      let received = 0;
      const reader = body.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > maxBytes) {
          return c.json(
            toErrorResponse(
              new AppError('PAYLOAD_TOO_LARGE', `Body exceeds ${maxBytes} bytes`, 413),
            ),
            413,
          );
        }
        chunks.push(value);
      }
      const merged = new Uint8Array(received);
      let off = 0;
      for (const ch of chunks) {
        merged.set(ch, off);
        off += ch.byteLength;
      }
      c.req.raw = new Request(c.req.raw.url, {
        method: c.req.raw.method,
        headers: c.req.raw.headers,
        body: merged,
      });
    }
    await next();
  };
}
