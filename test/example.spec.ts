import { it, beforeAll, afterAll, describe, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { execSync } from 'child_process'

describe('Transactions', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('o usuário consegue criar uma nova transação', async () => {
    await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 5000,
        type: 'credit',
      })
      .expect(201)
  })

  it('o usuário não consegue criar uma nova transação faltando o campo title', async () => {
    await request(app.server)
      .post('/transactions')
      .send({
        amount: 5000,
        type: 'credit',
      })
      .expect(500)
  })

  it('O usuário lista todas as transações', async () => {
    const createTransationResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 5000,
        type: 'credit',
      })
    const cookies = createTransationResponse.get('Set-Cookie')

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    expect(listTransactionsResponse.body.transactions).toEqual([
      expect.objectContaining({
        title: 'New transaction',
        amount: 5000,
      }),
    ])
  })

  it('O usuário lista uma transação especifica', async () => {
    const createTransationResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 3000,
        type: 'credit',
      })
    const cookies = createTransationResponse.get('Set-Cookie')

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    const transactionId = listTransactionsResponse.body.transactions[0].id

    const getTransactionById = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(getTransactionById.body.transaction).toEqual(
      expect.objectContaining({
        title: 'New transaction',
        amount: 3000,
      }),
    )
  })

  it('O usuário mostrar o Saldo geral  das transações', async () => {
    const createTransationResponse = await request(app.server)
      .post('/transactions')
      .send({
        title: 'New transaction',
        amount: 3000,
        type: 'credit',
      })
    const cookies = createTransationResponse.get('Set-Cookie')

    const listTransactionsResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies)
      .expect(200)

    expect(listTransactionsResponse.body.summary).toEqual({
      amount: 3000,
    })
  })
})
