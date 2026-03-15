import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { errorResponse } from '../lib/errors'

export const usersRoutes = new Hono()

// Protected routes — require auth
usersRoutes.use('*', authMiddleware)

usersRoutes.get('/me', async (c) => {
  // TODO: return current user from DB
  return errorResponse(c, 501, 'NOT_IMPLEMENTED', 'Not implemented yet')
})
