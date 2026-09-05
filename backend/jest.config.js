module.exports = {
  testEnvironment: 'node',
  testTimeout: 15000,
  // No global database hook: tests that need Mongo call useTestDatabase() from
  // tests/db.js themselves, so the realtime tests can run without one.
}
