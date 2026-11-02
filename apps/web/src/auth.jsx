import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!getToken())

  useEffect(() => {
    if (!getToken()) return
    api('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true))
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    // Cached API responses belong to this user; don't show them to the next one
    if ('caches' in window) caches.delete('cc-api').catch(() => {})
  }, [])

  useEffect(() => {
    window.addEventListener('cc:logout', logout)
    return () => window.removeEventListener('cc:logout', logout)
  }, [logout])

  const loginAs = useCallback(async (userId) => {
    const { token, user } = await api('/auth/dev-login', { method: 'POST', body: { user_id: userId } })
    setToken(token)
    setUser(user)
    return user
  }, [])

  return (
    <AuthContext.Provider value={{ user, ready, loginAs, logout }}>{children}</AuthContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export const useAuth = () => useContext(AuthContext)
