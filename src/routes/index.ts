import { Hono } from 'hono'
import { authRoutes } from './auth'
import { usersRoutes } from './users'

export const routes = new Hono()

routes.route('/auth', authRoutes)
routes.route('/users', usersRoutes)
