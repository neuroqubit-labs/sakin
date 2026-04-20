import * as SecureStore from 'expo-secure-store'
import type { AuthSession } from '@/contexts/auth-context'

const SESSION_KEY = 'sakin.session.v3'

export async function saveSession(session: AuthSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session))
  } catch {
    // SecureStore başarısızsa session bellekte yaşar; bir sonraki cold start'ta yeniden login gerekir.
  }
}

export async function loadSession(): Promise<AuthSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthSession>
    if (typeof parsed.userId !== 'string' || typeof parsed.role !== 'string') return null
    return {
      userId: parsed.userId,
      tenantId: parsed.tenantId ?? null,
      role: parsed.role,
      residentId: parsed.residentId ?? null,
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
    }
  } catch {
    return null
  }
}

export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY)
  } catch {
    // sessizce yut
  }
}
