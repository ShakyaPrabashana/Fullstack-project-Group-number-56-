const mongoose = require('mongoose')
const { loadEnv } = require('../src/config/env')

/**
 * Call at the top of any test file that needs MongoDB. Files that do not — the
 * realtime tests, for instance — then run without a database at all.
 */
function useTestDatabase() {
  const env = loadEnv()

  // Prefer the dedicated test database. CI points MONGO_URL straight at a _test
  // database, so fall back to it rather than demanding both be set.
  const url = env.mongoUrlTest || env.mongoUrl

  const name = (() => {
    try {
      return new URL(url).pathname.replace(/^\//, '')
    } catch {
      return ''
    }
  })()

  // The hooks below empty every collection. Running that against the development
  // database would delete real bookings, so refuse anything not named for testing.
  if (!/test/i.test(name)) {
    throw new Error(
      `Refusing to run tests against database "${name || url}".\n` +
        `These tests delete every collection after each test.\n` +
        `Point MONGO_URL_TEST at a database whose name contains "test" — see .env.fullstack.example.`,
    )
  }

  beforeAll(async () => {
    await mongoose.connect(url)
  })

  afterEach(async () => {
    const { collections } = mongoose.connection
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})))
  })

  afterAll(async () => {
    await mongoose.disconnect()
  })
}

module.exports = { useTestDatabase }
