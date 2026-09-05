const request = require('supertest')
const app = require('../src/app')
const { useTestDatabase } = require('./db')
const Resource = require('../src/models/Resource')

const DAY = '2026-01-15'

async function signUp(email, name = 'Test User') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'correct horse' })
  return { token: res.body.token, user: res.body.user }
}

async function seedResource(overrides = {}) {
  return Resource.create({
    _id: 'SR-14',
    kind: 'Room',
    category: 'Study room',
    name: 'Study Room 14',
    location: 'Library · Level 2',
    capacity: 8,
    features: ['Whiteboard'],
    ...overrides,
  })
}

useTestDatabase()

describe('resources', () => {
  it('requires a token', async () => {
    const res = await request(app).get('/api/resources')
    expect(res.status).toBe(401)
  })

  it('lists seeded resources for a signed-in user', async () => {
    await seedResource()
    const { token } = await signUp('a@nsbm.ac.lk')

    const res = await request(app).get('/api/resources').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([expect.objectContaining({ id: 'SR-14', name: 'Study Room 14' })])
  })
})

describe('POST /api/bookings', () => {
  it('books a free window', async () => {
    await seedResource()
    const { token } = await signUp('a@nsbm.ac.lk', 'Alice')

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ resourceId: 'SR-14', day: DAY, start: '10:00', end: '11:00', purpose: 'Group 56 sprint review' })

    expect(res.status).toBe(201)
    expect(res.body.booking).toMatchObject({
      resourceId: 'SR-14',
      day: DAY,
      start: '10:00',
      end: '11:00',
      userName: 'Alice',
    })
  })

  it('refuses an overlapping window and names who holds it', async () => {
    await seedResource()
    const alice = await signUp('alice@nsbm.ac.lk', 'Alice')
    const bob = await signUp('bob@nsbm.ac.lk', 'Bob')

    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ resourceId: 'SR-14', day: DAY, start: '10:00', end: '11:00', purpose: 'Alice first' })

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ resourceId: 'SR-14', day: DAY, start: '10:30', end: '11:30', purpose: 'Bob overlapping' })

    expect(res.status).toBe(409)
    expect(res.body.conflict.userName).toBe('Alice')
  })

  it('allows a booking that starts exactly when another ends', async () => {
    await seedResource()
    const { token } = await signUp('a@nsbm.ac.lk')

    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ resourceId: 'SR-14', day: DAY, start: '10:00', end: '11:00', purpose: 'First' })

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ resourceId: 'SR-14', day: DAY, start: '11:00', end: '12:00', purpose: 'Second' })

    expect(res.status).toBe(201)
  })

  it('resolves two truly simultaneous requests for the same window into exactly one booking', async () => {
    await seedResource()
    const alice = await signUp('alice@nsbm.ac.lk', 'Alice')
    const bob = await signUp('bob@nsbm.ac.lk', 'Bob')

    const attempt = (token, purpose) =>
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({ resourceId: 'SR-14', day: DAY, start: '14:00', end: '15:00', purpose })

    const [a, b] = await Promise.all([
      attempt(alice.token, 'Alice'),
      attempt(bob.token, 'Bob'),
    ])

    const statuses = [a.status, b.status].sort()
    expect(statuses).toEqual([201, 409])
  })

  it('rejects a window outside 08:00-20:00', async () => {
    await seedResource()
    const { token } = await signUp('a@nsbm.ac.lk')

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ resourceId: 'SR-14', day: DAY, start: '19:30', end: '21:00', purpose: 'Too late' })

    expect(res.status).toBe(400)
  })

  it('rejects a booking for a resource that does not exist', async () => {
    const { token } = await signUp('a@nsbm.ac.lk')

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ resourceId: 'GHOST-1', day: DAY, start: '10:00', end: '11:00', purpose: 'Nope' })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/bookings/:id', () => {
  it('only lets the owner cancel', async () => {
    await seedResource()
    const alice = await signUp('alice@nsbm.ac.lk', 'Alice')
    const bob = await signUp('bob@nsbm.ac.lk', 'Bob')

    const made = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ resourceId: 'SR-14', day: DAY, start: '10:00', end: '11:00', purpose: 'Alice' })

    const denied = await request(app)
      .delete(`/api/bookings/${made.body.booking.id}`)
      .set('Authorization', `Bearer ${bob.token}`)
    expect(denied.status).toBe(403)

    const allowed = await request(app)
      .delete(`/api/bookings/${made.body.booking.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
    expect(allowed.status).toBe(200)
  })

  it('frees the slot for someone else once cancelled', async () => {
    await seedResource()
    const alice = await signUp('alice@nsbm.ac.lk', 'Alice')
    const bob = await signUp('bob@nsbm.ac.lk', 'Bob')

    const made = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ resourceId: 'SR-14', day: DAY, start: '10:00', end: '11:00', purpose: 'Alice' })

    await request(app)
      .delete(`/api/bookings/${made.body.booking.id}`)
      .set('Authorization', `Bearer ${alice.token}`)

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ resourceId: 'SR-14', day: DAY, start: '10:00', end: '11:00', purpose: 'Bob' })

    expect(res.status).toBe(201)
  })
})
