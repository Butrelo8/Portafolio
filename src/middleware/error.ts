import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import { AppError, toErrorResponse } from '../lib/errors';
import { logger } from './requestLogger';

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get('requestId');

  if (err instanceof AppError) {
    logger.warn({
      msg: 'app_error',
      requestId,
      code: err.code,
      status: err.status,
      message: err.message,
    });
    return c.json(toErrorResponse(err), err.status as ContentfulStatusCode);
  }

  if (err instanceof ZodError) {
    const wrapped = new AppError('VALIDATION', 'Validation failed', 400, err.issues);
    logger.warn({ msg: 'validation_error', requestId, issues: err.issues });
    return c.json(toErrorResponse(wrapped), 400);
  }

  logger.error({
    msg: 'unhandled_error',
    requestId,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  return c.json(toErrorResponse(err), 500);
};
