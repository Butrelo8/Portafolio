import type { Context } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'

/**
 * Consistent error response shape across all endpoints.
 * Always use this instead of c.json({ error: ... }) directly.
 */
export const errorResponse = (
  c: Context,
  status: number,
  code: string,
  message: string,
) => {
  return c.json({
    error: { code, message, status }
  }, status as StatusCode)
}

/**
 * Consistent success response shape.
 */
export const successResponse = <T>(
  c: Context,
  data: T,
  status: number = 200,
) => {
  return c.json({ data }, status as StatusCode)
}
