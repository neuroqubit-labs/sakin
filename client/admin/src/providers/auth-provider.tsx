'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut, type User as FirebaseUser } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { apiClient, getDevTenantId, isDevBypassEnabled, setDevTenantId } from '@/lib/api'
import { setSessionCookie, clearSessionCookie, getSessionFromCookieString } from '@/lib/session'
import { UserRole } from '@sakin/shared'

interface AuthContextValue {
  user: FirebaseUser | null
  role: UserRole | null
  tenantId: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  tenantId: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) {
      const storageTenantId = getDevTenantId()
      const session = getSessionFromCookieString(document.cookie)
      const sessionTenantId = session?.tenantId ?? null
      const devTenantId = storageTenantId ?? sessionTenantId
      const canUseDevSession = isDevBypassEnabled() && Boolean(session)

      if (canUseDevSession && session) {
        if (devTenantId && devTenantId !== 'super') {
          setDevTenantId(devTenantId)
        }
        setRole(session.role)
        setTenantId(session.tenantId ?? devTenantId ?? null)
      } else {
        setRole(null)
        setTenantId(null)
        clearSessionCookie()
      }

      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        try {
          const profile = await apiClient<{ role: UserRole; tenantId: string | null; id: string }>('/auth/me')
          setRole(profile.role)
          setTenantId(profile.tenantId)
          setSessionCookie({ userId: profile.id, tenantId: profile.tenantId, role: profile.role })
        } catch {
          // Kullanıcı kayıtlı değil veya token geçersiz
          setRole(null)
          setTenantId(null)
          clearSessionCookie()
        }
      } else {
        const storageTenantId = getDevTenantId()
        const session = getSessionFromCookieString(document.cookie)
        const sessionTenantId = session?.tenantId ?? null
        const devTenantId = storageTenantId ?? sessionTenantId
        const canUseDevSession = isDevBypassEnabled() && Boolean(session)

        if (canUseDevSession && session) {
          if (devTenantId && devTenantId !== 'super') {
            setDevTenantId(devTenantId)
          }
          setRole(session.role)
          setTenantId(session.tenantId ?? devTenantId ?? null)
        } else {
          setRole(null)
          setTenantId(null)
          clearSessionCookie()
        }
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signOut = async () => {
    if (auth) {
      await firebaseSignOut(auth)
    }
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
