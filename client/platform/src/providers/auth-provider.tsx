'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { apiClient, getAccessToken, clearTokens } from '@/lib/api'
import { setSessionCookie, clearSessionCookie } from '@/lib/session'
import { UserRole } from '@sakin/shared'

interface AuthContextValue {
  user: { id: string; email: string | null; displayName: string | null } | null
  role: UserRole | null
  loading: boolean
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  loading: true,
  signOut: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAccessToken()

    if (token) {
      apiClient<{ id: string; email: string | null; displayName: string | null; tenantRoles: { tenantId: string | null; role: UserRole }[] }>('/auth/me')
        .then((profile) => {
          setUser({ id: profile.id, email: profile.email, displayName: profile.displayName })
          const superRole = profile.tenantRoles.find((r) => r.role === UserRole.SUPER_ADMIN)
          if (superRole) {
            setRole(superRole.role)
            setSessionCookie({ userId: profile.id, tenantId: null, role: superRole.role })
          } else {
            clearTokens()
            clearSessionCookie()
          }
        })
        .catch(() => {
          clearTokens()
          clearSessionCookie()
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const signOut = () => {
    clearTokens()
    clearSessionCookie()
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
