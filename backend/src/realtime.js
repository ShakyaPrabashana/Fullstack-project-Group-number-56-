const { Server } = require('socket.io')
const { verifyToken } = require('./utils/jwt')

/**
 * Real-time updates between connected clients (brief: M5).
 *
 * The server is the only thing that broadcasts. Clients never emit booking
 * events at each other — they call the REST API, and the controller announces
 * the result here once it has actually been written. That keeps the database
 * the single source of truth: a client cannot make other clients believe in a
 * booking that was never saved.
 */

let io = null

function init(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  })

  // Same JWT as the REST routes. An unauthenticated socket is refused rather
  // than being allowed to listen in on who is booking what.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Sign in to receive live updates.'))

    try {
      socket.user = verifyToken(token)
      next()
    } catch {
      next(new Error('Your session has expired or is invalid. Sign in again.'))
    }
  })

  const quiet = process.env.NODE_ENV === 'test'

  io.on('connection', (socket) => {
    if (!quiet) console.log(`Live: ${socket.user.name} connected (${io.engine.clientsCount} online)`)
    socket.on('disconnect', () => {
      if (!quiet) console.log(`Live: ${socket.user.name} disconnected`)
    })
  })

  return io
}

/**
 * Tell every connected client the board changed. `actorId` lets a client ignore
 * the echo of its own action, which it has already applied locally.
 */
function announceBookingsChanged({ action, booking, actorId }) {
  if (!io) return // No socket server in tests, or before init() has run.
  io.emit('bookings:changed', { action, booking, actorId, at: new Date().toISOString() })
}

module.exports = { init, announceBookingsChanged }
