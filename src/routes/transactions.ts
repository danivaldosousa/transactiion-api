import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import crypto, { randomUUID } from 'node:crypto'
import { knex } from '../database'
import { CheckSessionIdExists } from '../middlewares/check-session-id-exists'

export async function transactionsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', (request, reply) => {
    console.log(`${request.method} - ${request.url}`)
  })

  app.get(
    '/',
    { preHandler: [CheckSessionIdExists] },
    async (request, reply) => {
      const sessionId = request.cookies.sessionId
      const transactions = await knex('transactions')
        .where('session_id', sessionId)
        .select('*')

      return {
        transactions,
      }
    },
  )

  app.get(
    '/:id',
    { preHandler: [CheckSessionIdExists] },
    async (request, reply) => {
      const getTransactionsParamsSchema = z.object({
        id: z.string().uuid(),
      })
      const { id } = getTransactionsParamsSchema.parse(request.params)
      const sessionId = request.cookies.sessionId

      const transaction = await knex('transactions')
        .where({ id, session_id: sessionId })
        .first()

      return { transaction }
    },
  )

  app.get(
    '/summary',
    { preHandler: [CheckSessionIdExists] },
    async (request) => {
      const sessionId = request.cookies.sessionId
      const summary = await knex('transactions')
        .where('session_id', sessionId)
        .sum('amount', { as: 'amount' })
        .first()

      return { summary }
    },
  )

  app.post('/', async (request, reply) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
    })
    const { title, amount, type } = createTransactionBodySchema.parse(
      request.body,
    )

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 24 * 7, // 7 dias
      })
    }
    await knex('transactions').insert({
      id: crypto.randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId,
    })
    return reply.status(201).send()
  })
}
