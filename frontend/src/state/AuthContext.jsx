import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as api from '../api/client'
import { disconnect, refreshAuth } from '../lib/live'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => api.currentUser())
  const [busy, setBusy] = useState(false)

  const signIn = useCallback(async (credentials) => {
    setBusy(true)
    const result = await api.login(credentials)
    if (result.ok) {
      setUser(result.user)
      refreshAuth() // reconnect the socket with the new token
    }
    setBusy(false)
    return result
  }, [])

  const signUp = useCallback(async (details) => {
    setBusy(true)
    const result = await api.register(details)
    if (result.ok) {
      setUser(result.user)
      refreshAuth()
    }
    setBusy(false)
    return result
  }, [])

  const signOut = useCallback(() => {
    api.logout()
    disconnect() // stop listening as soon as the token is gone
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, busy, signIn, signUp, signOut }), [user, busy, signIn, signUp, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
