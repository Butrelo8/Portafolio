import type { MiddlewareHandler } from 'hono';
import { env } from '../env';
import { resolveClientIp } from '../lib/clientIp';
import { redact } from '../lib/safeLog';

type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function log(level: Level, payload: Record<string, unknown>): void {
  if (ORDER[level] < ORDER[env.LOG_LEVEL as Level]) return;
  const entry = {
    time: new Date().toISOString(),
    level,
    ...(redact(payload) as Record<string, unknown>),
  };
  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (payload: Record<string, unknown>) => log('debug', payload),
  info: (payload: Record<string, unknown>) => log('info', payload),
  warn: (payload: Record<string, unknown>) => log('warn', payload),
  error: (payload: Record<string, unknown>) => log('error', payload),
};

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const requestId = crypto.randomUUID();
  const rawClient = c.req.header('x-request-id');
  const clientRequestId =
    typeof rawClient === 'string' && rawClient.trim().length > 0 ? rawClient.trim() : undefined;

  c.set('requestId', requestId);
  c.set('traceId', requestId);
  if (clientRequestId !== undefined) c.set('clientRequestId', clientRequestId);

  c.header('x-request-id', requestId);

  const start = performance.now();
  await next();
  const durationMs = Math.round(performance.now() - start);
  const clientIp = resolveClientIp(c, env.TRUST_PROXY);
  logger.info({
    msg: 'request',
    traceId: requestId,
    clientIp,
    ...(clientRequestId !== undefined ? { clientRequestId } : {}),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs,
  });
};
