import { beforeEach, describe, expect, it } from 'vitest'
import { cancelBooking, createBooking, listBookings, login, readBookings, register } from './client'
import { todayIso } from '../lib/time'

const user = { id: 'u1', name: 'Shakya P' }
const other = { id: 'u2', name: 'Dilini F' }

function draft(overrides = {}) {
  return {
    resourceId: 'SR-14',
    day: todayIso(),
    start: '10:00',
    end: '11:00',
    purpose: 'Group 56 sprint review',
    ...overrides,
  }
}

describe('bookings', () => {
  beforeEach(async () => {
    await listBookings() // seeds the demo holds
  })

  it('books a free window', async () => {
    const result = await createBooking(draft(), user)
    expect(result.ok).toBe(true)
    expect(readBookings().some((b) => b.id === result.booking.id)).toBe(true)
  })

  it('refuses an overlapping window and names who holds it', async () => {
    await createBooking(draft(), other)
    const result = await createBooking(draft({ start: '10:30', end: '11:30' }), user)

    expect(result.ok).toBe(false)
    expect(result.conflict.userName).toBe('Dilini F')
  })

  it('leaves the first booking untouched when a second one conflicts', async () => {
    const first = await createBooking(draft(), other)
    await createBooking(draft({ purpose: 'Something else' }), user)

    const stored = readBookings().filter((b) => b.resourceId === 'SR-14')
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe(first.booking.id)
    expect(stored[0].purpose).toBe('Group 56 sprint review')
  })

  it('allows a booking that starts exactly when another ends', async () => {
    await createBooking(draft(), other)
    const result = await createBooking(draft({ start: '11:00', end: '12:00' }), user)
    expect(result.ok).toBe(true)
  })

  it('only lets the owner cancel', async () => {
    const made = await createBooking(draft(), other)
    const denied = await cancelBooking(made.booking.id, user)

    expect(denied.ok).toBe(false)
    expect(denied.error).toContain('Dilini F')
    expect(readBookings().some((b) => b.id === made.booking.id)).toBe(true)

    const allowed = await cancelBooking(made.booking.id, other)
    expect(allowed.ok).toBe(true)
  })
})

describe('accounts', () => {
  it('registers, then signs in with the same credentials', async () => {
    const made = await register({
      name: 'Shakya P',
      email: 'Shakya@students.nsbm.ac.lk',
      password: 'correct horse',
    })
    expect(made.ok).toBe(true)

    const back = await login({ email: 'shakya@students.nsbm.ac.lk', password: 'correct horse' })
    expect(back.ok).toBe(true)
    expect(back.user.name).toBe('Shakya P')
  })

  it('never stores the password itself', async () => {
    await register({ name: 'A B', email: 'ab@nsbm.ac.lk', password: 'plaintext-secret' })
    expect(window.localStorage.getItem('campusbook:users')).not.toContain('plaintext-secret')
  })

  it('rejects a wrong password without saying which half was wrong', async () => {
    await register({ name: 'A B', email: 'ab@nsbm.ac.lk', password: 'right-password' })

    const wrongPassword = await login({ email: 'ab@nsbm.ac.lk', password: 'nope' })
    const noSuchUser = await login({ email: 'ghost@nsbm.ac.lk', password: 'nope' })

    expect(wrongPassword.ok).toBe(false)
    expect(wrongPassword.error).toBe(noSuchUser.error)
  })
})
