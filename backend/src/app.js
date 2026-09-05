const cors = require('cors')
const express = require('express')
const morgan = require('morgan')

const authRoutes = require('./routes/authRoutes')
const resourceRoutes = require('./routes/resourceRoutes')
const bookingRoutes = require('./routes/bookingRoutes')
const { notFound } = require('./middleware/notFound')
const { errorHandler } = require('./middleware/errorHandler')

// Exported without a listener attached, so tests can drive it through
// supertest(app) against whatever database connection they set up themselves.
const app = express()

app.use(cors())
app.use(express.json())
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'))

app.get('/health', (req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)
app.use('/api/resources', resourceRoutes)
app.use('/api/bookings', bookingRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
