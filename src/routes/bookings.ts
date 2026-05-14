import type { FastifyInstance, FastifyReply } from 'fastify'
import { BookingError, CreateBookingBodySchema } from '../lib/types.js'
import * as svc from '../lib/service.js'

function handleError(reply: FastifyReply, err: unknown) {
  if (err instanceof BookingError) {
    return reply.status(err.httpStatus).send({ success: false, error: err.message, code: err.code })
  }
  return reply.status(500).send({ success: false, error: 'Internal server error' })
}

export async function bookingRoutes(app: FastifyInstance) {

  // POST /bookings — shipper creates a booking intent (status=pending)
  app.post('/', async (req, reply) => {
    const parsed = CreateBookingBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: parsed.error.errors[0].message,
        code: 'VALIDATION_ERROR',
      })
    }
    try {
      const booking = await svc.createBooking(parsed.data, req.user)
      return reply.status(201).send({ success: true, data: booking })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // GET /bookings/:id — get booking with driver profile joined
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    try {
      const booking = await svc.getBooking(id, req.user)
      return reply.send({ success: true, data: booking })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // GET /bookings — shipper: own bookings | driver: pending bookings | admin: all
  app.get('/', async (req, reply) => {
    try {
      const bookings = await svc.listBookings(req.user)
      return reply.send({ success: true, data: bookings })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // PATCH /bookings/:id/accept — driver accepts a pending booking
  app.patch('/:id/accept', async (req, reply) => {
    const { id } = req.params as { id: string }
    try {
      const booking = await svc.acceptBooking(id, req.user)
      return reply.send({ success: true, data: booking })
    } catch (err) {
      return handleError(reply, err)
    }
  })

  // PATCH /bookings/:id/cancel — cancel from pending or accepted
  app.patch('/:id/cancel', async (req, reply) => {
    const { id } = req.params as { id: string }
    try {
      const booking = await svc.cancelBooking(id, req.user)
      return reply.send({ success: true, data: booking })
    } catch (err) {
      return handleError(reply, err)
    }
  })
}
