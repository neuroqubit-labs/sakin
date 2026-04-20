import { createContext, useContext, type ReactNode } from 'react'

export interface AuthSession {
  userId: string
  tenantId: string | null
  role: string
  residentId?: string | null
  accessToken?: string | null
  refreshToken?: string | null
}

interface AuthContextValue {
  session: AuthSession | null
  signIn: (session: AuthSession) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue>({
  session: null,
  signIn: () => undefined,
  signOut: () => undefined,
})

export function useAuthSession() {
  return useContext(AuthContext)
}

export function AuthProvider({
  session,
  signIn,
  signOut,
  children,
}: {
  session: AuthSession | null
  signIn: (session: AuthSession) => void
  signOut: () => void
  children: ReactNode
}) {
  return (
    <AuthContext.Provider value={{ session, signIn, signOut }}>{children}</AuthContext.Provider>
  )
}
