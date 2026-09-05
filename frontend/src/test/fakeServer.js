/**
 * An in-memory stand-in for the Express API, installed over global.fetch.
 *
 * It implements the same contract backend/README.md documents — status codes,
 * response shapes, JWT-style bearer auth, and the 409-with-conflict on an
 * overlapping window — so the frontend tests exercise the real HTTP path
 * (headers, status handling, error mapping) without needing a server or Mongo.
 *
 * It is a test double, not a second implementation to keep in sync: if the API
 * contract changes, this changes with it.
 */

import { RESOURCES } from '../data/resources'

function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return toMin(aStart) < toMin(bEnd) && toMin(bStart) < toMin(aEnd)
}

export function createFakeServer({ resources = RESOURCES } = {}) {
  const users = []
  const bookings = []
  let nextId = 1

  const tokenFor = (user) => `fake-token.${user.id}`
  const userForToken = (token) => users.find((u) => tokenFor(u) === token) ?? null

  // jsdom under Jest has no global Response, and the client only reads ok,
  // status and text() — so a plain object of that shape is enough and keeps the
  // double independent of which fetch implementation the environment provides.
  function json(status, body) {
    const payload = JSON.stringify(body)
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
      text: async () => payload,
      json: async () => JSON.parse(payload),
    }
  }

  async function handle(url, options = {}) {
    const method = options.method ?? 'GET'
    const path = url.replace(/^.*\/api/, '')
    const body = options.body ? JSON.parse(options.body) : null

    const auth = options.headers?.Authorization ?? null
    const actor = auth?.startsWith('Bearer ') ? userForToken(auth.slice(7)) : null

    /* ---- auth ---- */
    if (path === '/auth/register' && method === 'POST') {
      const email = (body.email ?? '').trim().toLowerCase()
      if ((body.password ?? '').length < 8) {
        return json(400, { message: 'Use at least 8 characters for your password.' })
      }
      if (users.some((u) => u.email === email)) {
        return json(409, { message: 'That email is already registered. Sign in instead.' })
      }
      const user = { id: String(nextId++), name: body.name.trim(), email }
      users.push({ ...user, password: body.password })
      return json(201, { token: tokenFor(user), user })
    }

    if (path === '/auth/login' && method === 'POST') {
      const email = (body.email ?? '').trim().toLowerCase()
      const found = users.find((u) => u.email === email && u.password === body.password)
      if (!found) {
        return json(401, { message: 'That email and password do not match an account.' })
      }
      const user = { id: found.id, name: found.name, email: found.email }
      return json(200, { token: tokenFor(user), user })
    }

    /* ---- everything below needs a token ---- */
    if (!actor) return json(401, { message: 'Sign in to do that.' })

    if (path === '/resources' && method === 'GET') {
      return json(200, resources)
    }

    if (path.startsWith('/bookings') && method === 'GET') {
      const day = new URLSearchParams(path.split('?')[1] ?? '').get('day')
      return json(200, day ? bookings.filter((b) => b.day === day) : bookings)
    }

    if (path === '/bookings' && method === 'POST') {
      const clash = bookings.find(
        (b) =>
          b.resourceId === body.resourceId &&
          b.day === body.day &&
          overlaps(body.start, body.end, b.start, b.end),
      )
      if (clash) {
        return json(409, { message: 'That window is not free.', conflict: clash })
      }

      const booking = {
        id: String(nextId++),
        resourceId: body.resourceId,
        day: body.day,
        start: body.start,
        end: body.end,
        purpose: body.purpose,
        userId: actor.id,
        userName: actor.name,
      }
      bookings.push(booking)
      return json(201, { booking })
    }

    if (path.startsWith('/bookings/') && method === 'DELETE') {
      const id = path.split('/')[2]
      const index = bookings.findIndex((b) => b.id === id)
      if (index === -1) {
        return json(404, { message: 'That booking is already gone. The board has been refreshed.' })
      }
      if (bookings[index].userId !== actor.id) {
        return json(403, {
          message: `${bookings[index].userName} owns that booking. You can only cancel your own.`,
        })
      }
      bookings.splice(index, 1)
      return json(200, { ok: true })
    }

    return json(404, { message: `No route for ${method} ${path}.` })
  }

  return {
    fetch: (url, options) => handle(String(url), options),
    /** Put a booking in place directly, as if another user had made it. */
    seedBooking(booking) {
      const full = { id: String(nextId++), ...booking }
      bookings.push(full)
      return full
    },
    seedUser({ name, email, password }) {
      const user = { id: String(nextId++), name, email: email.toLowerCase() }
      users.push({ ...user, password })
      return { ...user, token: tokenFor(user) }
    },
    get bookings() {
      return bookings
    },
  }
}

/** Installs the fake over global.fetch and returns it. */
export function installFakeServer(options) {
  const server = createFakeServer(options)
  globalThis.fetch = server.fetch
  return server
}
