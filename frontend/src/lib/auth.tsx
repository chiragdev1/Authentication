import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiRequestError, type User } from './api.ts'

type AuthState = {
  user: User | null
  // true until the first /auth/me answers, so protected pages don't flash a redirect
  loading: boolean
  reloadUser: () => Promise<User | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const reloadUser = useCallback(async () => {
    try {
      const { data } = await api<User>('/auth/me', { authed: true })
      setUser(data)
      return data
    } catch (error) {
      // 401/403 just mean "not signed in"; anything else is logged but treated the same
      if(!(error instanceof ApiRequestError) || ![401, 403].includes(error.status)) {
        console.error(error)
      }
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    // logout always clears the cookies server side, so drop local state even if the call fails
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
  }, [])

  useEffect(() => {
    reloadUser()
  }, [reloadUser])

  return (
    <AuthContext.Provider value={{ user, loading, reloadUser, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if(!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
