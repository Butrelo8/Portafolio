import type { MiddlewareHandler } from 'hono';
import type { ZodSchema } from 'zod';
import { AppError } from '../lib/errors';

export interface ValidationSchemas {
  json?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schemas: ValidationSchemas): MiddlewareHandler {
  return async (c, next) => {
    const validated: Record<string, unknown> = {};

    if (schemas.json) {
      let raw: unknown;
      try {
        raw = await c.req.json();
      } catch {
        throw new AppError('BAD_REQUEST', 'Invalid JSON body', 400);
      }
      validated.json = schemas.json.parse(raw);
    }
    if (schemas.query) validated.query = schemas.query.parse(c.req.query());
    if (schemas.params) validated.params = schemas.params.parse(c.req.param());

    c.set('validated', validated as { json?: unknown; query?: unknown; params?: unknown });
    await next();
  };
}
