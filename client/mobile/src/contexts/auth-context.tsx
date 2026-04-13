import { createContext, useContext, type ReactNode } from 'react'

export interface AuthSession {
  userId: string
  tenantId: string | null
  role: string
}

interface AuthContextValue {
  session: AuthSession | null
  setSession: (session: AuthSession | null) => void
}

export const AuthContext = createContext<AuthContextValue>({
  session: null,
  setSession: () => undefined,
})

export function useAuthSession() {
  return useContext(AuthContext)
}

export function AuthProvider({
  session,
  setSession,
  children,
}: {
  session: AuthSession | null
  setSession: (session: AuthSession | null) => void
  children: ReactNode
}) {
  return <AuthContext.Provider value={{ session, setSession }}>{children}</AuthContext.Provider>
}
