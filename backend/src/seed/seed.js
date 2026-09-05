const mongoose = require('mongoose')
const { loadEnv } = require('../config/env')
const Resource = require('../models/Resource')
const resources = require('./resources')

const env = loadEnv({ required: ['MONGO_URL'] })

async function main() {
  await mongoose.connect(env.mongoUrl)

  await Resource.deleteMany({})
  await Resource.insertMany(resources)

  console.log(`Seeded ${resources.length} resources into ${mongoose.connection.name}.`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
