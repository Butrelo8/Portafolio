import type { Context, Next } from 'hono'
import { errorResponse } from '../lib/errors'

export const authMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return errorResponse(c, 401, 'UNAUTHORIZED', 'Missing auth token')
  }

  // TODO: verify token with Clerk or JWT
  // const user = await verifyToken(token)
  // c.set('user', user)

  await next()
}
