import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import jwt from 'jsonwebtoken'
import { supabase } from '../lib/supabase.js'
import type { AuthenticatedUser } from '../lib/types.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (req, reply) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return reply.status(401).send({ success: false, error: 'Missing Bearer token' })
    }

    const token = header.slice(7)
    let payload: jwt.JwtPayload

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload
    } catch {
      return reply.status(401).send({ success: false, error: 'Invalid or expired token' })
    }

    const authId = payload.sub
    if (!authId) {
      return reply.status(401).send({ success: false, error: 'Token missing sub claim' })
    }

    const { data: userRow, error } = await supabase
      .from('users')
      .select('id, role, full_name, phone_number')
      .eq('auth_id', authId)
      .single()

    if (error || !userRow) {
      return reply.status(401).send({ success: false, error: 'User not found' })
    }

    req.user = {
      userId:      userRow.id,
      authId,
      role:        userRow.role,
      fullName:    userRow.full_name,
      phoneNumber: userRow.phone_number,
    }
  })
}

export default fp(authPlugin)
