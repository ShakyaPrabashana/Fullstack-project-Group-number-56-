/**
 * The live layer (brief: M5 real-time).
 *
 * Until the Socket.io server exists, "other connected clients" are other browser
 * tabs, wired together with BroadcastChannel. Open the app twice, log in as two
 * different people, and bookings appear in both windows as they are made.
 *
 * This is the ONLY file that needs to change when the backend lands:
 *
 *   import { io } from 'socket.io-client'
 *   const socket = io(import.meta.env.VITE_API_URL)
 *   socket.on('bookings:changed', onMessage)
 *   ... publish -> socket.emit('bookings:changed', message)
 *
 * The rest of the app only knows about connect()/publish().
 */

const CHANNEL = 'campusbook:live'

export function connect(onMessage) {
  if (typeof window === 'undefined') return () => {}

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CHANNEL)
    const handle = (event) => onMessage(event.data)
    channel.addEventListener('message', handle)
    return () => {
      channel.removeEventListener('message', handle)
      channel.close()
    }
  }

  // Fallback for browsers without BroadcastChannel: the storage event also
  // fires across tabs, so relay through a scratch key.
  const handle = (event) => {
    if (event.key !== CHANNEL || !event.newValue) return
    try {
      onMessage(JSON.parse(event.newValue).message)
    } catch {
      /* ignore malformed relay */
    }
  }
  window.addEventListener('storage', handle)
  return () => window.removeEventListener('storage', handle)
}

export function publish(message) {
  if (typeof window === 'undefined') return

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CHANNEL)
    channel.postMessage(message)
    channel.close()
    return
  }

  try {
    // `at` forces a value change so the storage event always fires.
    window.localStorage.setItem(CHANNEL, JSON.stringify({ at: Date.now(), message }))
  } catch {
    /* nothing to do */
  }
}
