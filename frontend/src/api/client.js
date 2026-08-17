/**
 * API client.
 *
 * Every call is async and shaped like the REST endpoints coming in M2, so wiring
 * the real backend means replacing the bodies here and nothing else:
 *
 *   listResources  -> GET    /api/resources
 *   listBookings   -> GET    /api/bookings?day=YYYY-MM-DD
 *   createBooking  -> POST   /api/bookings
 *   cancelBooking  -> DELETE /api/bookings/:id
 *   register/login -> POST   /api/auth/register | /api/auth/login
 *
 * Until then it persists to localStorage and does its own conflict checking, the
 * same check the server will own later.
 */

import { RESOURCES } from '../data/resources'
import { KEYS, read, write } from '../lib/storage'
import { publish } from '../lib/live'
import { addMinutes, overlaps, todayIso, isoDay } from '../lib/time'

const LATENCY = 120 // ms — keeps loading states honest while the backend is absent

function wait(ms = LATENCY) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`
}

/* ---------------- Auth ----------------
 * Passwords are salted and hashed before they touch localStorage so credentials
 * are never sitting in the clear. This is still a stand-in, not security: real
 * auth is a JWT issued by the Express server in M2. Nothing here is trusted.
 */

async function hash(password, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function register({ name, email, password }) {
  await wait()
  const users = read(KEYS.users, [])
  const clean = email.trim().toLowerCase()

  if (users.some((u) => u.email === clean)) {
    return { ok: false, error: 'That email is already registered. Sign in instead.' }
  }

  const salt = uid()
  const user = {
    id: uid(),
    name: name.trim(),
    email: clean,
    salt,
    hash: await hash(password, salt),
  }
  write(KEYS.users, [...users, user])

  const session = { id: user.id, name: user.name, email: user.email }
  write(KEYS.session, session)
  return { ok: true, user: session }
}

export async function login({ email, password }) {
  await wait()
  const users = read(KEYS.users, [])
  const user = users.find((u) => u.email === email.trim().toLowerCase())

  // Same message either way — don't reveal which half was wrong.
  const rejection = { ok: false, error: 'That email and password do not match an account.' }
  if (!user) return rejection
  if ((await hash(password, user.salt)) !== user.hash) return rejection

  const session = { id: user.id, name: user.name, email: user.email }
  write(KEYS.session, session)
  return { ok: true, user: session }
}

export function currentUser() {
  return read(KEYS.session, null)
}

export function logout() {
  write(KEYS.session, null)
}

/* ---------------- Resources ---------------- */

export async function listResources() {
  await wait(60)
  return RESOURCES
}

/* ---------------- Bookings ---------------- */

/** Seed a few holds by other people so the board is not empty on first run. */
function seedBookings() {
  if (read(KEYS.seeded, false)) return
  const today = todayIso()
  const tomorrow = isoDay(new Date(Date.now() + 86400000))

  const seed = [
    ['LT-1', today, '09:00', 120, 'Software Architecture lecture', 'D. Fernando'],
    ['LAB-A', today, '13:00', 120, 'Full Stack Development lab', 'T. Wickramasinghe'],
    ['LAB-B', today, '10:00', 90, 'Network Security practical', 'R. Jayawardena'],
    ['SR-12', today, '15:00', 60, 'Group 41 stand-up', 'A. Nawaz'],
    ['CAM-03', today, '11:00', 180, 'Media unit shoot', 'N. Gunasekara'],
    ['PRJ-014', today, '14:00', 60, 'Guest talk setup', 'S. Bandara'],
    ['LT-3', tomorrow, '08:30', 120, 'Machine Learning lecture', 'A. Silva'],
    ['LAB-C', tomorrow, '13:00', 150, 'Multimedia coursework', 'H. Dissanayake'],
    ['VR-01', tomorrow, '10:00', 120, 'XR research session', 'K. Perera'],
  ]

  write(
    KEYS.bookings,
    seed.map(([resourceId, day, start, minutes, purpose, userName]) => ({
      id: uid(),
      resourceId,
      day,
      start,
      end: addMinutes(start, minutes),
      purpose,
      userId: `seed-${userName}`,
      userName,
      version: 1,
      updatedAt: new Date().toISOString(),
    })),
  )
  write(KEYS.seeded, true)
}

export async function listBookings() {
  seedBookings()
  await wait(60)
  return read(KEYS.bookings, [])
}

/** Read straight through, no latency — used for the check at confirm time. */
export function readBookings() {
  return read(KEYS.bookings, [])
}

function findClash(bookings, { resourceId, day, start, end, ignoreId }) {
  return bookings.find(
    (b) =>
      b.id !== ignoreId &&
      b.resourceId === resourceId &&
      b.day === day &&
      overlaps(start, end, b.start, b.end),
  )
}

/**
 * Create a booking, re-checking the slot against current state first.
 *
 * This is the concurrency guard the brief asks for: between opening a draft and
 * confirming it, another client may have taken the window. Rather than writing
 * over them, return the booking that got there first so the UI can say who has it.
 */
export async function createBooking(draft, user) {
  await wait()
  const bookings = readBookings()
  const clash = findClash(bookings, draft)

  if (clash) {
    return { ok: false, conflict: clash }
  }

  const booking = {
    id: uid(),
    resourceId: draft.resourceId,
    day: draft.day,
    start: draft.start,
    end: draft.end,
    purpose: draft.purpose.trim(),
    userId: user.id,
    userName: user.name,
    version: 1,
    updatedAt: new Date().toISOString(),
  }

  const next = [...bookings, booking]
  write(KEYS.bookings, next)
  publish({ type: 'bookings:changed', bookings: next })
  return { ok: true, booking }
}

export async function cancelBooking(id, user) {
  await wait()
  const bookings = readBookings()
  const target = bookings.find((b) => b.id === id)

  if (!target) {
    return { ok: false, error: 'That booking is already gone. The board has been refreshed.' }
  }
  if (target.userId !== user.id) {
    return { ok: false, error: `${target.userName} owns that booking. You can only cancel your own.` }
  }

  const next = bookings.filter((b) => b.id !== id)
  write(KEYS.bookings, next)
  publish({ type: 'bookings:changed', bookings: next })
  return { ok: true }
}
