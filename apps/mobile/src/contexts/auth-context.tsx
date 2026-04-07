import { createContext, useContext, type ReactNode } from 'react'

export interface AuthSession {
  userId: string
  tenantId: string | null
  role: string
}

interface AuthContextValue {
  session: AuthSession | null
}

export const AuthContext = createContext<AuthContextValue>({ session: null })

export function useAuthSession() {
  return useContext(AuthContext)
}

export function AuthProvider({ session, children }: { session: AuthSession | null; children: ReactNode }) {
  return <AuthContext.Provider value={{ session }}>{children}</AuthContext.Provider>
}
