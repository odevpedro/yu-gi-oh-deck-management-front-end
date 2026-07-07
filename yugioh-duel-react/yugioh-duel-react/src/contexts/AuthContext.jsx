import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { login as loginRequest, register as registerRequest } from '../services/authService'
import { clearTokens, getAccessToken, setTokens } from '../services/tokenManager'

const AuthContext = createContext(null)

function decodeUser(token) {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      id: payload.userId,
      username: payload.sub,
      role: payload.role,
    }
  } catch {
    return null
  }
}

function userFromResponse(data) {
  return {
    id: data.id,
    username: data.username,
    email: data.email,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(decodeUser(getAccessToken()))
    setLoading(false)
  }, [])

  const login = useCallback(async (username, password) => {
    const data = await loginRequest(username, password)
    setTokens(data.accessToken, data.refreshToken)
    setUser(userFromResponse(data))
    return data
  }, [])

  const register = useCallback(async (username, email, password) => {
    const data = await registerRequest(username, email, password)
    setTokens(data.accessToken, data.refreshToken)
    setUser(userFromResponse(data))
    return data
  }, [])

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  const startLocalSession = useCallback(() => {
    clearTokens()
    setUser({ id: 'local-player', username: 'Local Player', role: 'LOCAL' })
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, startLocalSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
