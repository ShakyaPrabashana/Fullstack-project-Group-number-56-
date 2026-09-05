import '@testing-library/jest-dom'
import { webcrypto } from 'node:crypto'
import { TextDecoder, TextEncoder } from 'node:util'
import { cleanup } from '@testing-library/react'
import { __reset } from './socketMock'

// jsdom under Jest provides neither of these, and react-router needs them.
if (!globalThis.TextEncoder) globalThis.TextEncoder = TextEncoder
if (!globalThis.TextDecoder) globalThis.TextDecoder = TextDecoder

// jsdom ships without SubtleCrypto/randomUUID, which some libraries reach for.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}

// Vite injects this at build time; Jest has to supply it.
globalThis.__API_URL__ = ''

beforeEach(() => {
  window.localStorage.clear()
  // BrowserRouter reads window.location, and jsdom keeps it between tests.
  window.history.pushState({}, '', '/')
  __reset()
})

afterEach(() => {
  cleanup()
})
