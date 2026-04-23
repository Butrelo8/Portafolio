import type { MiddlewareHandler } from 'hono';
import { isHttps } from '../lib/forwardedProto';

export function httpsRedirect(enabled: boolean): MiddlewareHandler {
  return async (c, next) => {
    if (enabled && !isHttps(c.req.raw.headers)) {
      const url = new URL(c.req.url);
      url.protocol = 'https:';
      return c.redirect(url.toString(), 301);
    }
    await next();
  };
}
