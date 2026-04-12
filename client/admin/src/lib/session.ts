import { UserRole } from '@sakin/shared'

export interface SessionData {
  userId: string
  tenantId: string | null
  role: UserRole
}

const COOKIE_NAME = 'sakin-session'

export function encodeSession(data: SessionData): string {
  return btoa(JSON.stringify(data))
}

export function decodeSession(value: string): SessionData | null {
  try {
    return JSON.parse(atob(value)) as SessionData
  } catch {
    return null
  }
}

export function setSessionCookie(data: SessionData): void {
  const encoded = encodeSession(data)
  document.cookie = `${COOKIE_NAME}=${encoded}; path=/; SameSite=Lax; max-age=${7 * 24 * 60 * 60}`
}

export function clearSessionCookie(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
}

export function getSessionFromCookieString(cookieStr: string): SessionData | null {
  const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  if (!match?.[1]) return null
  return decodeSession(match[1])
}
