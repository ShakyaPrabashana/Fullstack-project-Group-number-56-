const http = require('http')
const { loadEnv } = require('./config/env')

// Loaded before anything else, so a missing key fails here with a clear message
// rather than deep inside mongoose or jsonwebtoken.
const env = loadEnv()

const app = require('./app')
const { connectDB } = require('./config/db')
const realtime = require('./realtime')

// Express and Socket.io share one HTTP server, so both are reachable on the
// same port and the same nginx proxy rule covers them.
const server = http.createServer(app)
realtime.init(server)

connectDB(env.mongoUrl)
  .then(() => {
    server.listen(env.port, () => {
      console.log(`CampusBook API listening on :${env.port} (REST + WebSocket)`)
    })
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB, exiting.', err)
    process.exit(1)
  })
