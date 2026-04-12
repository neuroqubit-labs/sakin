import { auth } from './firebase'

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'
const DEV_TENANT_ID_KEY = 'dev_tenant_id'
const SESSION_COOKIE_KEY = 'sakin-session'

async function getToken(): Promise<string | null> {
  if (!auth) return null
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

export function getDevTenantId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(DEV_TENANT_ID_KEY)
}

function getDevTenantIdFromSessionCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_KEY}=([^;]+)`))
  if (!match?.[1]) return null
  try {
    const parsed = JSON.parse(atob(match[1])) as { tenantId?: string | null; role?: string }
    if (parsed.role === 'SUPER_ADMIN') return 'super'
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

export async function apiClient<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const token = await getToken()
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
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else if (isDevBypassEnabled() && devTenantId) {
    if (typeof window !== 'undefined' && getDevTenantId() !== devTenantId && devTenantId !== 'super') {
      setDevTenantId(devTenantId)
    }
    headers['x-dev-tenant-id'] = devTenantId
  }

  const response = await fetch(url, { ...fetchOptions, headers })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Bilinmeyen hata' }))
    throw new Error((error as { message: string }).message ?? 'API hatası')
  }

  const json = await response.json() as { data: T }
  return json.data
}
