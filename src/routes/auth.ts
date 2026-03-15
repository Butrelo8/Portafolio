import { Hono } from 'hono'
import { errorResponse } from '../lib/errors'

export const authRoutes = new Hono()

authRoutes.post('/login', async (c) => {
  // TODO: implement login
  return errorResponse(c, 501, 'NOT_IMPLEMENTED', 'Login not implemented yet')
})

authRoutes.post('/logout', async (c) => {
  // TODO: implement logout
  return errorResponse(c, 501, 'NOT_IMPLEMENTED', 'Logout not implemented yet')
})
