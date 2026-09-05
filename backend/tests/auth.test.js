const request = require('supertest')
const app = require('../src/app')
const { useTestDatabase } = require('./db')

useTestDatabase()

describe('POST /api/auth/register', () => {
  it('creates an account and returns a usable token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Shakya P',
      email: 'shakya@students.nsbm.ac.lk',
      password: 'correct horse',
    })

    expect(res.status).toBe(201)
    expect(res.body.token).toEqual(expect.any(String))
    expect(res.body.user).toMatchObject({ name: 'Shakya P', email: 'shakya@students.nsbm.ac.lk' })
    expect(res.body.user).not.toHaveProperty('password')
    expect(res.body.user).not.toHaveProperty('passwordHash')
  })

  it('refuses a second registration with the same email', async () => {
    const details = { name: 'A B', email: 'ab@nsbm.ac.lk', password: 'right-password' }
    await request(app).post('/api/auth/register').send(details)

    const res = await request(app).post('/api/auth/register').send(details)
    expect(res.status).toBe(409)
  })

  it('rejects a short password before it ever reaches the database', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A B', email: 'ab@nsbm.ac.lk', password: 'short' })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'A B', email: 'ab@nsbm.ac.lk', password: 'right-password' })
  })

  it('signs in with the registered credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ab@nsbm.ac.lk', password: 'right-password' })

    expect(res.status).toBe(200)
    expect(res.body.token).toEqual(expect.any(String))
  })

  it('gives the same message for a wrong password and for no such account', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ab@nsbm.ac.lk', password: 'nope' })
    const noSuchUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@nsbm.ac.lk', password: 'nope' })

    expect(wrongPassword.status).toBe(401)
    expect(noSuchUser.status).toBe(401)
    expect(wrongPassword.body.message).toBe(noSuchUser.body.message)
  })
})
