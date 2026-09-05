const http = require('http')
const { io: ioClient } = require('socket.io-client')
const realtime = require('../src/realtime')
const { signToken } = require('../src/utils/jwt')

/**
 * The WebSocket layer on its own — no database involved, so this runs even when
 * Mongo is not available. It proves three things the brief asks for: that a
 * connection needs a valid JWT, that a rejected token cannot listen, and that a
 * server-side announcement reaches every connected client.
 */

const user = { _id: { toString: () => 'user-1' }, name: 'Alice', email: 'alice@nsbm.ac.lk' }

let server
let port

beforeAll((done) => {
  server = http.createServer()
  realtime.init(server)
  server.listen(0, () => {
    port = server.address().port
    done()
  })
})

afterAll((done) => {
  server.close(done)
})

function connect(token) {
  return ioClient(`http://localhost:${port}`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
  })
}

describe('realtime', () => {
  it('refuses a connection with no token', (done) => {
    const socket = connect(undefined)
    socket.on('connect_error', (err) => {
      expect(err.message).toMatch(/sign in/i)
      socket.close()
      done()
    })
  })

  it('refuses a connection with a forged token', (done) => {
    const socket = connect('not.a.real.token')
    socket.on('connect_error', (err) => {
      expect(err.message).toMatch(/expired or is invalid/i)
      socket.close()
      done()
    })
  })

  it('accepts a valid token and delivers a broadcast', (done) => {
    const socket = connect(signToken(user))

    socket.on('bookings:changed', (payload) => {
      expect(payload).toMatchObject({ action: 'created', actorId: 'user-1' })
      expect(payload.booking.resourceId).toBe('SR-14')
      socket.close()
      done()
    })

    socket.on('connect', () => {
      realtime.announceBookingsChanged({
        action: 'created',
        booking: { id: 'b1', resourceId: 'SR-14', start: '10:00', end: '11:00' },
        actorId: 'user-1',
      })
    })
  })

  it('reaches every connected client, not just the one that acted', (done) => {
    const a = connect(signToken(user))
    const b = connect(signToken({ ...user, _id: { toString: () => 'user-2' }, name: 'Bob' }))

    let received = 0
    const onEvent = () => {
      received += 1
      if (received === 2) {
        a.close()
        b.close()
        done()
      }
    }

    a.on('bookings:changed', onEvent)
    b.on('bookings:changed', onEvent)

    let connected = 0
    const onConnect = () => {
      connected += 1
      if (connected === 2) {
        realtime.announceBookingsChanged({
          action: 'cancelled',
          booking: { id: 'b1', resourceId: 'LAB-A' },
          actorId: 'user-1',
        })
      }
    }

    a.on('connect', onConnect)
    b.on('connect', onConnect)
  })
})
