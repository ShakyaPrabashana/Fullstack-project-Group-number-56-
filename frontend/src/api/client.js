/**
 * API client — the only file that talks to the Express backend.
 *
 *   listResources  -> GET    /api/resources
 *   listBookings   -> GET    /api/bookings?day=YYYY-MM-DD
 *   createBooking  -> POST   /api/bookings
 *   cancelBooking  -> DELETE /api/bookings/:id
 *   register/login -> POST   /api/auth/register | /api/auth/login
 *
 * Requests go to a relative /api path, which both environments already route:
 * Vite proxies it to localhost:8080 in dev, nginx proxies it to the backend
 * container in production. Set VITE_API_URL to point somewhere else.
 */

import { KEYS, read, remove, write } from '../lib/storage'

// Replaced by Vite at build time; defined as '' by the Jest setup file.
const BASE = typeof __API_URL__ === 'string' ? __API_URL__ : ''

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

function authToken() {
  return read(KEYS.token, null)
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = auth ? authToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // The server is unreachable — down, restarting, or no network at all.
    throw new ApiError('Cannot reach the server. Check it is running and try again.', 0, null)
  }

  // A proxy error page is HTML, not JSON, so parsing has to be allowed to fail.
  const text = await res.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!res.ok) {
    throw new ApiError(payload?.message ?? `Request failed (${res.status}).`, res.status, payload)
  }
  return payload
}

/* ---------------- Auth ----------------
 * The server owns credentials now: it hashes with bcrypt and issues a JWT. The
 * token and the signed-in user are kept in localStorage so a page refresh does
 * not bounce you back to the sign-in screen.
 */

function saveSession({ token, user }) {
  write(KEYS.token, token)
  write(KEYS.session, user)
}

export async function register({ name, email, password }) {
  try {
    const data = await request('/auth/register', {
      method: 'POST',
      body: { name, email, password },
      auth: false,
    })
    saveSession(data)
    return { ok: true, user: data.user }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

export async function login({ email, password }) {
  try {
    const data = await request('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    })
    saveSession(data)
    return { ok: true, user: data.user }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

export function currentUser() {
  return read(KEYS.session, null)
}

export function logout() {
  remove(KEYS.token)
  remove(KEYS.session)
}

/* ---------------- Resources ---------------- */

export async function listResources() {
  return request('/resources')
}

/* ---------------- Bookings ---------------- */

export async function listBookings(day) {
  return request(day ? `/bookings?day=${encodeURIComponent(day)}` : '/bookings')
}

/**
 * The server re-checks the window and owns the conflict decision: it claims each
 * half-hour under a unique index, so if someone took the slot between opening
 * this draft and confirming it, the response is a 409 carrying their booking
 * rather than an overwrite.
 */
export async function createBooking(draft) {
  try {
    const data = await request('/bookings', {
      method: 'POST',
      body: {
        resourceId: draft.resourceId,
        day: draft.day,
        start: draft.start,
        end: draft.end,
        purpose: draft.purpose.trim(),
      },
    })
    // No client-side broadcast: the server emits bookings:changed over the
    // socket once the write has landed.
    return { ok: true, booking: data.booking }
  } catch (err) {
    if (err.status === 409) {
      return { ok: false, conflict: err.payload?.conflict ?? null, error: err.message }
    }
    return { ok: false, error: err.message }
  }
}

export async function cancelBooking(id) {
  try {
    await request(`/bookings/${id}`, { method: 'DELETE' })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}
