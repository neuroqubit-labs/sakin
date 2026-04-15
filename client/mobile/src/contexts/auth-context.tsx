import { createContext, useContext, type ReactNode } from 'react'

export interface AuthSession {
  userId: string
  tenantId: string | null
  role: string
  residentId?: string | null
}

interface AuthContextValue {
  session: AuthSession | null
  setSession: (session: AuthSession | null) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue>({
  session: null,
  setSession: () => undefined,
  signOut: () => undefined,
})

export function useAuthSession() {
  return useContext(AuthContext)
}

export function AuthProvider({
  session,
  setSession,
  signOut,
  children,
}: {
  session: AuthSession | null
  setSession: (session: AuthSession | null) => void
  signOut: () => void
  children: ReactNode
}) {
  return (
    <AuthContext.Provider value={{ session, setSession, signOut }}>{children}</AuthContext.Provider>
  )
}
