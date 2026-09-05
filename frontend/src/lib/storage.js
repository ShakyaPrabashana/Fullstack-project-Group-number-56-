/**
 * Client-side persistence (brief: M3).
 * Everything the app keeps locally goes through here so the storage surface is
 * one file — swapping to IndexedDB later means changing this, nothing else.
 */

const PREFIX = 'campusbook:'

export const KEYS = {
  token: `${PREFIX}token`, // JWT from the server, sent on every authenticated request
  session: `${PREFIX}session`, // the signed-in user, so a refresh doesn't bounce to /login
  draft: `${PREFIX}draft`, // the in-progress booking, kept across refresh
}

export function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    // Private mode, quota, or corrupt JSON — fall back rather than crash.
    return fallback
  }
}

export function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function remove(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* nothing to do */
  }
}
