module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],
  moduleNameMapper: {
    // Jest cannot parse CSS; styling is not what these tests assert on.
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    // socket.io-client would open a real connection, and ships ESM Jest will not
    // parse. The double lets tests fire server broadcasts on demand instead.
    '^socket\\.io-client$': '<rootDir>/src/test/socketMock.js',
  },
  testMatch: ['<rootDir>/src/**/*.test.{js,jsx}'],
  // The end-to-end flows drive a lot of typing through jsdom; a loaded CI runner
  // is much slower than a local machine.
  testTimeout: 30000,
}
