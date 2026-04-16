'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { apiClient, getAccessToken, clearTokens, getDevTenantId, isDevBypassEnabled, setDevTenantId } from '@/lib/api'
import { setSessionCookie, clearSessionCookie, getSessionFromCookieString } from '@/lib/session'
import { UserRole } from '@sakin/shared'

interface AuthContextValue {
  user: { id: string; email: string | null; displayName: string | null } | null
  role: UserRole | null
  tenantId: string | null
  loading: boolean
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  tenantId: null,
  loading: true,
  signOut: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAccessToken()

    // JWT token varsa — profili API'den al
    if (token) {
      apiClient<{ id: string; email: string | null; displayName: string | null; tenantRoles: { tenantId: string | null; role: UserRole }[] }>('/auth/me')
        .then((profile) => {
          setUser({ id: profile.id, email: profile.email, displayName: profile.displayName })
          const firstRole = profile.tenantRoles[0]
          if (firstRole) {
            setRole(firstRole.role)
            setTenantId(firstRole.tenantId)
            setSessionCookie({ userId: profile.id, tenantId: firstRole.tenantId, role: firstRole.role })
          }
        })
        .catch(() => {
          clearTokens()
          clearSessionCookie()
        })
        .finally(() => setLoading(false))
      return
    }

    // Dev bypass — token yok ama session cookie var
    const storageTenantId = getDevTenantId()
    const session = getSessionFromCookieString(document.cookie)
    const sessionTenantId = session?.tenantId ?? null
    const devTenantIdVal = storageTenantId ?? sessionTenantId
    const canUseDevSession = isDevBypassEnabled() && Boolean(session)

    if (canUseDevSession && session) {
      if (devTenantIdVal && devTenantIdVal !== 'super') {
        setDevTenantId(devTenantIdVal)
      }
      setRole(session.role)
      setTenantId(session.tenantId ?? devTenantIdVal ?? null)
    } else {
      setRole(null)
      setTenantId(null)
      clearSessionCookie()
    }

    setLoading(false)
  }, [])

  const signOut = () => {
    clearTokens()
    clearSessionCookie()
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, role, tenantId, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
