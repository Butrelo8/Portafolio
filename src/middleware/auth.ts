import { verifyToken } from '@clerk/backend';
import type { MiddlewareHandler } from 'hono';
import { clerkAuthorizedParties } from '../lib/corsOrigins';
import { AppError, toErrorResponse } from '../lib/errors';

export interface AuthSession {
  userId: string;
  sessionId: string;
}

export interface AuthOptions {
  verify: (token: string) => Promise<AuthSession | null>;
}

export function requireAuth(opts: AuthOptions): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header('authorization') ?? c.req.header('Authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token) return c.json(toErrorResponse(new AppError('UNAUTHORIZED', 'Missing bearer token', 401)), 401);
    const session = await opts.verify(token);
    if (!session) return c.json(toErrorResponse(new AppError('UNAUTHORIZED', 'Invalid token', 401)), 401);
    c.set('userId', session.userId);
    c.set('sessionId', session.sessionId);
    await next();
  };
}

export function createClerkVerifier(config: {
  secretKey: string;
  authorizedParties: string[];
}): AuthOptions['verify'] {
  return async (token) => {
    try {
      const payload = await verifyToken(token, {
        secretKey: config.secretKey,
        authorizedParties: clerkAuthorizedParties(config.authorizedParties),
      });
      if (!payload.sub) return null;
      return { userId: payload.sub, sessionId: (payload.sid as string | undefined) ?? '' };
    } catch {
      return null;
    }
  };
}
