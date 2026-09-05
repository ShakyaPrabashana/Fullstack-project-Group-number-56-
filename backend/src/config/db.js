const mongoose = require('mongoose')

async function connectDB(url) {
  mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err))
  await mongoose.connect(url)
  console.log(`MongoDB connected: ${mongoose.connection.name}`)
}

module.exports = { connectDB }
