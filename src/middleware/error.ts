import type { Context } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'

export const errorHandler = (err: Error, c: Context) => {
  console.error(`[ERROR] ${err.message}`, {
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  })

  // Known app errors
  if (err.name === 'AppError') {
    const appErr = err as AppError
    return c.json({
      error: {
        code: appErr.code,
        message: appErr.message,
        status: appErr.status,
      }
    }, appErr.status as StatusCode)
  }

  // Unknown errors — don't leak details in production
  return c.json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred',
      status: 500,
    }
  }, 500)
}

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public status: number = 400,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
