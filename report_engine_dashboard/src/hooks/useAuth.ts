import { useCallback, useEffect, useState } from 'react'
import { api, ApiClientError } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import type { ApiUser, LoginResponse } from '@/services/api/types'

const AUTH_USER_KEY = 'jiddah_auth_user'

export function useAuth() {
  const [user, setUser] = useState<ApiUser | null>(() => {
    try {
      const raw = sessionStorage.getItem(AUTH_USER_KEY)
      return raw ? (JSON.parse(raw) as ApiUser) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const persistUser = useCallback((next: ApiUser | null) => {
    setUser(next)
    if (next) {
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(next))
    } else {
      sessionStorage.removeItem(AUTH_USER_KEY)
    }
  }, [])

  const checkSession = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<LoginResponse>(ENDPOINTS.auth.refresh, undefined, {
        skipAuth: true,
      })
      persistUser(res.user)
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        persistUser(null)
      }
      // Keep cached user on transient/network errors so UI stays consistent
    } finally {
      setLoading(false)
    }
  }, [persistUser])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null)
      try {
        const res = await api.post<LoginResponse>(
          ENDPOINTS.auth.login,
          { email, password },
          { skipAuth: true }
        )
        persistUser(res.user)
        return res.user
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed'
        setError(message)
        throw err
      }
    },
    [persistUser]
  )

  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
      setError(null)
      try {
        const res = await api.post<LoginResponse & { message?: string; session?: boolean }>(
          ENDPOINTS.auth.signup,
          { email, password, name },
          { skipAuth: true }
        )
        if (res.user) persistUser(res.user)
        return res
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sign up failed'
        setError(message)
        throw err
      }
    },
    [persistUser]
  )

  const logout = useCallback(async () => {
    try {
      await api.post(ENDPOINTS.auth.logout, undefined, { skipAuth: true })
    } finally {
      persistUser(null)
    }
  }, [persistUser])

  return {
    user,
    isAuthenticated: Boolean(user),
    loading,
    error,
    login,
    signUp,
    logout,
    checkSession,
  }
}
