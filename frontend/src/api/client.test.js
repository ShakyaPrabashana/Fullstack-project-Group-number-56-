import { cancelBooking, createBooking, listBookings, listResources, login, logout, register } from './client'
import { installFakeServer } from '../test/fakeServer'
import { KEYS, read } from '../lib/storage'

const DAY = '2026-01-15'

function draft(overrides = {}) {
  return {
    resourceId: 'SR-14',
    day: DAY,
    start: '10:00',
    end: '11:00',
    purpose: 'Group 56 sprint review',
    ...overrides,
  }
}

let server

beforeEach(() => {
  server = installFakeServer()
})

describe('auth', () => {
  it('stores the token and user after registering', async () => {
    const result = await register({
      name: 'Shakya P',
      email: 'Shakya@students.nsbm.ac.lk',
      password: 'correct horse',
    })

    expect(result.ok).toBe(true)
    expect(result.user).toMatchObject({ name: 'Shakya P', email: 'shakya@students.nsbm.ac.lk' })
    expect(read(KEYS.token, null)).toEqual(expect.any(String))
    expect(read(KEYS.session, null)).toMatchObject({ name: 'Shakya P' })
  })

  it('surfaces the server message when the password is wrong', async () => {
    server.seedUser({ name: 'A B', email: 'ab@nsbm.ac.lk', password: 'right-password' })

    const result = await login({ email: 'ab@nsbm.ac.lk', password: 'nope' })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/do not match/i)
  })

  it('clears the token on sign out', async () => {
    await register({ name: 'A B', email: 'ab@nsbm.ac.lk', password: 'correct horse' })
    logout()

    expect(read(KEYS.token, null)).toBeNull()
    expect(read(KEYS.session, null)).toBeNull()
  })

  it('never stores the password itself', async () => {
    await register({ name: 'A B', email: 'ab@nsbm.ac.lk', password: 'plaintext-secret' })
    expect(JSON.stringify(window.localStorage)).not.toContain('plaintext-secret')
  })
})

describe('authenticated requests', () => {
  it('sends the bearer token on every call', async () => {
    await register({ name: 'A B', email: 'ab@nsbm.ac.lk', password: 'correct horse' })

    const spy = jest.spyOn(globalThis, 'fetch')
    await listResources()

    const [, options] = spy.mock.calls[0]
    expect(options.headers.Authorization).toMatch(/^Bearer /)
  })

  it('is rejected without a token', async () => {
    const result = await createBooking(draft())
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/sign in/i)
  })
})

describe('bookings', () => {
  beforeEach(async () => {
    await register({ name: 'Shakya P', email: 'shakya@nsbm.ac.lk', password: 'correct horse' })
  })

  it('books a free window', async () => {
    const result = await createBooking(draft())

    expect(result.ok).toBe(true)
    expect(result.booking).toMatchObject({ resourceId: 'SR-14', start: '10:00', end: '11:00' })
    expect(await listBookings()).toHaveLength(1)
  })

  it('reports the conflict when the window is taken, without overwriting it', async () => {
    server.seedBooking({
      resourceId: 'SR-14',
      day: DAY,
      start: '10:00',
      end: '11:00',
      purpose: 'Already booked',
      userId: 'someone-else',
      userName: 'Dilini F',
    })

    const result = await createBooking(draft({ start: '10:30', end: '11:30' }))

    expect(result.ok).toBe(false)
    expect(result.conflict.userName).toBe('Dilini F')
    // The original booking is still the only one on the board.
    expect(await listBookings()).toHaveLength(1)
  })

  it('allows a booking that starts exactly when another ends', async () => {
    await createBooking(draft())
    const result = await createBooking(draft({ start: '11:00', end: '12:00' }))
    expect(result.ok).toBe(true)
  })

  it('filters by day when one is given', async () => {
    await createBooking(draft())
    await createBooking(draft({ day: '2026-01-16' }))

    expect(await listBookings(DAY)).toHaveLength(1)
    expect(await listBookings()).toHaveLength(2)
  })

  it('refuses to cancel a booking owned by someone else', async () => {
    const theirs = server.seedBooking({
      resourceId: 'LAB-A',
      day: DAY,
      start: '13:00',
      end: '14:00',
      purpose: 'Theirs',
      userId: 'someone-else',
      userName: 'Dilini F',
    })

    const result = await cancelBooking(theirs.id)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Dilini F')
    expect(await listBookings()).toHaveLength(1)
  })

  it('cancels your own booking', async () => {
    const made = await createBooking(draft())
    const result = await cancelBooking(made.booking.id)

    expect(result.ok).toBe(true)
    expect(await listBookings()).toHaveLength(0)
  })
})

describe('when the server is unreachable', () => {
  it('reports a readable message instead of throwing', async () => {
    globalThis.fetch = () => Promise.reject(new TypeError('Failed to fetch'))

    const result = await login({ email: 'a@b.co', password: 'whatever' })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/cannot reach the server/i)
  })
})
