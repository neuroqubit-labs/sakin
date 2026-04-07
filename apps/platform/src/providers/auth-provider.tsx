'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut, type User as FirebaseUser } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { apiClient } from '@/lib/api'
import { setSessionCookie, clearSessionCookie } from '@/lib/session'
import { UserRole } from '@sakin/shared'

interface AuthContextValue {
  user: FirebaseUser | null
  role: UserRole | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        try {
          const profile = await apiClient<{ role: UserRole; tenantId: string | null; id: string }>('/auth/me')
          setRole(profile.role)
          setSessionCookie({ userId: profile.id, tenantId: profile.tenantId, role: profile.role })
        } catch {
          setRole(null)
          clearSessionCookie()
        }
      } else {
        setRole(null)
        clearSessionCookie()
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signOut = async () => {
    await firebaseSignOut(auth)
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

