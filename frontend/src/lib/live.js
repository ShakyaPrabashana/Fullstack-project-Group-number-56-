/**
 * Real-time updates between connected clients (brief: M5), over Socket.io.
 *
 * The server is the only broadcaster. This client listens and never emits
 * booking events — changes go through the REST API, and the server announces
 * them once they are actually written. Two people on different machines see
 * each other's bookings appear as they happen.
 *
 * The socket carries the same JWT as the REST calls, so an unauthenticated
 * connection is refused rather than being allowed to watch the board.
 */

import { io } from 'socket.io-client'
import { KEYS, read } from './storage'

// Same origin as the API: Vite proxies it in dev, nginx proxies it in Docker
// (the proxy already passes the Upgrade header that WebSockets need).
const URL = typeof __API_URL__ === 'string' ? __API_URL__ : ''

let socket = null

function getSocket() {
  if (socket) return socket

  socket = io(URL || undefined, {
    auth: (cb) => cb({ token: read(KEYS.token, null) }),
    autoConnect: true,
    // Falls back to long-polling where a proxy will not upgrade the connection.
    transports: ['websocket', 'polling'],
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  })

  return socket
}

/**
 * Subscribe to board changes. Returns an unsubscribe function.
 * The callback shape is kept from the previous implementation so callers did
 * not have to change: { type: 'bookings:changed', ... }.
 */
export function connect(onMessage) {
  let live
  try {
    live = getSocket()
  } catch {
    // Nothing to listen to; the app still works, it just will not live-update.
    return () => {}
  }

  const handler = (payload) => onMessage({ type: 'bookings:changed', ...payload })
  live.on('bookings:changed', handler)

  return () => {
    live.off('bookings:changed', handler)
  }
}

/** Re-authenticate the socket after a sign-in or sign-out changes the token. */
export function refreshAuth() {
  if (!socket) return
  socket.disconnect()
  socket.connect()
}

export function disconnect() {
  if (!socket) return
  socket.disconnect()
  socket = null
}
