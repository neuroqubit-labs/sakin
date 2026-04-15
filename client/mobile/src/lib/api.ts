import { getFirebaseAuth } from '@/lib/firebase-auth'
import { DEV_BYPASS_ENABLED } from '@/lib/env'
import { NativeModules } from 'react-native'

const expoApiUrl = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env?.EXPO_PUBLIC_API_URL

function resolveBaseUrl() {
  const configured = expoApiUrl ?? 'http://localhost:3001/api/v1'

  // Physical devices cannot reach backend via localhost; swap host with Metro host.
  if (!configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured
  }

  try {
    const scriptURL = (NativeModules as { SourceCode?: { scriptURL?: string } }).SourceCode
      ?.scriptURL
    if (!scriptURL) return configured

    const metroUrl = new URL(scriptURL)
    const backendUrl = new URL(configured)
    backendUrl.hostname = metroUrl.hostname
    return backendUrl.toString()
  } catch {
    return configured
  }
}

const BASE_URL = resolveBaseUrl()

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

async function getToken(): Promise<string | null> {
  const auth = getFirebaseAuth()
  const user = auth?.currentUser ?? null
  if (!user) return null
  try {
    return await user.getIdToken()
  } catch {
    return null
  }
}

type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

/** _layout.tsx 401 tepkisini (logout + login redirect) burada kayıt ediyor. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiClient<T>(
  path: string,
  options: FetchOptions = {},
  tenantId?: string | null,
): Promise<T> {
  const token = await getToken()

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
    ...(fetchOptions.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    if (tenantId) {
      headers['x-tenant-id'] = tenantId
    }
  } else if (tenantId && DEV_BYPASS_ENABLED) {
    // Prod bundle'da kapalı — DEV_BYPASS_ENABLED iki kilit birden açıksa true.
    headers['x-dev-tenant-id'] = tenantId
  }

  const response = await fetch(url, { ...fetchOptions, headers })

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as {
      message?: string
      code?: string
      details?: unknown
    }
    if (response.status === 401 && unauthorizedHandler) {
      unauthorizedHandler()
    }
    throw new ApiError(
      errorBody.message ?? `HTTP ${response.status}`,
      response.status,
      errorBody.code,
    )
  }

  const json = (await response.json()) as { data: T }
  return json.data
}

export interface RegisterResponse {
  userId: string
  tenantId: string | null
  role: string
}

export interface DevBootstrapResponse {
  ready: boolean
  tenantId?: string
  tenantName?: string
  tenantSlug?: string
  message?: string
}

export async function registerUser(): Promise<RegisterResponse | null> {
  const auth = getFirebaseAuth()
  const user = auth?.currentUser ?? null
  if (!user) return null
  const token = await user.getIdToken()

  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firebaseToken: token }),
  })

  if (!response.ok) return null
  const json = (await response.json()) as { data: RegisterResponse }
  return json.data
}

export async function getDevBootstrap(): Promise<DevBootstrapResponse> {
  return apiClient<DevBootstrapResponse>('/auth/dev-bootstrap')
}
