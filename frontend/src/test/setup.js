import '@testing-library/jest-dom/vitest'
import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom ships without SubtleCrypto, which the password hashing needs.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}

beforeEach(() => {
  window.localStorage.clear()
  // BrowserRouter reads window.location, and jsdom keeps it between tests.
  window.history.pushState({}, '', '/')
})

afterEach(() => {
  cleanup()
})
