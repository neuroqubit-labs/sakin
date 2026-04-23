export const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

export class ApiError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message)
    this.name = 'ApiError'
  }
}

const ACCESS_TOKEN_KEY = 'sakin-access-token'
const REFRESH_TOKEN_KEY = 'sakin-refresh-token'
const DEV_TENANT_ID_KEY = 'dev_tenant_id'
const SESSION_COOKIE_KEY = 'sakin-session'

// ─── Token Yönetimi ───────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

// ─── Dev Bypass ───────────────────────────────────────────────

export function getDevTenantId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(DEV_TENANT_ID_KEY)
}

function getDevTenantIdFromSessionCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_KEY}=([^;]+)`))
  if (!match?.[1]) return null
  try {
    const parsed = JSON.parse(atob(match[1])) as { tenantId?: string | null }
    return parsed.tenantId ?? null
  } catch {
    return null
  }
}

export function setDevTenantId(id: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEV_TENANT_ID_KEY, id)
}

export function isDevBypassEnabled(): boolean {
  return process.env['NEXT_PUBLIC_USE_DEV_BYPASS'] === 'true' || process.env['NODE_ENV'] !== 'production'
}

// ─── Token Refresh ────────────────────────────────────────────

let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return false

    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) return false

      const json = await response.json() as { data: { accessToken: string; refreshToken: string } }
      setTokens(json.data.accessToken, json.data.refreshToken)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// ─── API Client ───────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

export async function apiClient<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const token = getAccessToken()
  const devTenantId = getDevTenantId() ?? getDevTenantIdFromSessionCookie()

  const { params, ...fetchOptions } = options

  let url = `${BASE_URL}${path}`
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value))
    })
    const qs = searchParams.toString()
    if (qs) url += `?${qs}`
  }

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  }

  if (fetchOptions.body !== undefined && fetchOptions.body !== null) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else if (isDevBypassEnabled() && devTenantId) {
    if (typeof window !== 'undefined' && getDevTenantId() !== devTenantId) {
      setDevTenantId(devTenantId)
    }
    headers['x-dev-tenant-id'] = devTenantId
  }

  const response = await fetch(url, { ...fetchOptions, headers })

  if (!response.ok) {
    // 401 → token yenilemeyi dene
    if (response.status === 401 && typeof window !== 'undefined') {
      const refreshed = await tryRefreshToken()
      if (refreshed) {
        // Yeni token ile tekrar dene
        headers['Authorization'] = `Bearer ${getAccessToken()}`
        const retryResponse = await fetch(url, { ...fetchOptions, headers })
        if (retryResponse.ok) {
          const json = await retryResponse.json() as { data: T }
          return json.data
        }
      }

      // Refresh de başarısız → login'e yönlendir
      clearTokens()
      window.location.href = '/login'
      return undefined as never
    }

    const body = await response.json().catch(() => ({ message: 'Bilinmeyen hata' }))
    const message = (body as { message: string }).message ?? 'API hatası'
    const error = new ApiError(message, response.status)
    throw error
  }

  const json = await response.json() as { data: T }
  return json.data
}
