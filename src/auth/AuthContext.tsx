import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiFetch, setAccessToken, setRefreshHandler } from '../api/client'
import type { Me, RegisterGym, StaffPermissionCode } from '../api/types'
import { hasPermission as profileHasPermission } from '../lib/permissions'
import { AuthContext } from './context'

const REFRESH_TOKEN_KEY = 'gym-hub-refresh-token'


function readRefreshToken() {
  try {
    return window.sessionStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

function writeRefreshToken(token: string) {
  try {
    window.sessionStorage.setItem(REFRESH_TOKEN_KEY, token)
  } catch {
    // A blocked storage API should not prevent this tab from staying signed in.
  }
}

function removeRefreshToken() {
  try {
    window.sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // Ignore unavailable storage while clearing a session.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  const clearSession = useCallback(() => {
    setAccessToken(null)
    removeRefreshToken()
    setProfile(null)
  }, [])

  const refresh = useCallback(async () => {
    const refreshToken = readRefreshToken()
    if (!refreshToken) return null
    try {
      const result = await apiFetch('/api/token/refresh/', 'post', {
        body: { refresh: refreshToken },
        skipAuthRefresh: true,
      })
      setAccessToken(result.access)
      return result.access
    } catch {
      clearSession()
      return null
    }
  }, [clearSession])

  const loadProfile = useCallback(async () => {
    const result = await apiFetch('/api/me/', 'get')
    setProfile(result)
    return result
  }, [])

  useEffect(() => {
    setRefreshHandler(refresh)
    const restoreSession = async () => {
      try {
        if (readRefreshToken()) {
          const token = await refresh()
          if (token) await loadProfile()
        }
      } catch {
        clearSession()
      } finally {
        setLoading(false)
      }
    }
    void restoreSession()
    return () => setRefreshHandler(null)
  }, [clearSession, loadProfile, refresh])

  const signIn = useCallback(
    async (phone: string, password: string) => {
      const tokens = await apiFetch('/api/token/', 'post', {
        body: { phone, password },
        skipAuthRefresh: true,
      })
      setAccessToken(tokens.access)
      writeRefreshToken(tokens.refresh)
      await loadProfile()
    },
    [loadProfile],
  )

  const login = useCallback(
    async (phone: string, password: string) => {
      await signIn(phone, password)
    },
    [signIn],
  )

  const registerGym = useCallback(
    async (input: RegisterGym) => {
      const registered = await apiFetch('/api/auth/register-gym/', 'post', {
        body: input,
        skipAuthRefresh: true,
      })
      await signIn(input.phone, input.password)
      return registered
    },
    [signIn],
  )

  const logout = useCallback(() => {
    clearSession()
  }, [clearSession])

  const hasPermission = useCallback(
    (code: StaffPermissionCode) => (profile ? profileHasPermission(profile, code) : false),
    [profile],
  )

  const value = useMemo(
    () => ({ profile, loading, login, registerGym, logout, hasPermission }),
    [profile, loading, login, registerGym, logout, hasPermission],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
