/**
 * Stands in for socket.io-client in tests (wired up in jest.config.cjs).
 *
 * Tests drive it with __emit(), so the real-time path — subscribe, receive a
 * server broadcast, refetch the board — is exercised without a running server.
 */

const listeners = new Map()

const socket = {
  connected: true,
  on(event, cb) {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event).add(cb)
    return socket
  },
  off(event, cb) {
    listeners.get(event)?.delete(cb)
    return socket
  },
  emit() {
    return socket
  },
  connect() {
    socket.connected = true
    return socket
  },
  disconnect() {
    socket.connected = false
    return socket
  },
}

export function io() {
  return socket
}

/** Fire a server broadcast at everything currently subscribed. */
export function __emit(event, payload) {
  for (const cb of listeners.get(event) ?? []) cb(payload)
}

export function __reset() {
  listeners.clear()
  socket.connected = true
}

export const __socket = socket
