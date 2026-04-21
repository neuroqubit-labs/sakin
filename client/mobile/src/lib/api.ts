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
export const API_BASE_URL = BASE_URL

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

type UnauthorizedHandler = () => void
type TokenRefresher = () => Promise<string | null>

let unauthorizedHandler: UnauthorizedHandler | null = null
let accessToken: string | null = null
let tokenRefresher: TokenRefresher | null = null
let refreshInFlight: Promise<string | null> | null = null
let devResidentId: string | null = null

/** SecureStore'dan yüklenen / OTP verify sonrası elde edilen access token'ı buraya yaz. */
export function setAccessToken(token: string | null) {
  accessToken = token
}

/** Refresh token ile yeni access token alma fonksiyonunu (_layout.tsx tarafından) kaydeder. */
export function setTokenRefresher(refresher: TokenRefresher | null) {
  tokenRefresher = refresher
}

/** Dev modda RESIDENT bypass için residentId'yi set eder. */
export function setDevResidentId(id: string | null) {
  devResidentId = id
}

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

async function tryRefreshToken(): Promise<string | null> {
  if (!tokenRefresher) return null
  if (!refreshInFlight) {
    refreshInFlight = tokenRefresher().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function rawFetch(
  path: string,
  options: FetchOptions,
  tenantId: string | null | undefined,
  tokenOverride: string | null,
): Promise<Response> {
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

  if (tokenOverride) {
    headers['Authorization'] = `Bearer ${tokenOverride}`
    if (tenantId) {
      headers['x-tenant-id'] = tenantId
    }
  } else if (tenantId && DEV_BYPASS_ENABLED) {
    headers['x-dev-tenant-id'] = tenantId
    if (devResidentId) {
      headers['x-dev-role'] = 'RESIDENT'
      headers['x-dev-resident-id'] = devResidentId
    }
  }

  return fetch(url, { ...fetchOptions, headers })
}

export async function apiClient<T>(
  path: string,
  options: FetchOptions = {},
  tenantId?: string | null,
): Promise<T> {
  let response = await rawFetch(path, options, tenantId, accessToken)

  if (response.status === 401 && accessToken) {
    // Access token süresi bittiyse bir kez refresh denemesi.
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      accessToken = refreshed
      response = await rawFetch(path, options, tenantId, refreshed)
    }
  }

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

export interface OtpRequestResponse {
  ok: boolean
  phoneNumber: string
  devCode?: string
}

export interface AuthTokenResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string | null
    phoneNumber: string | null
    displayName: string | null
  }
}

export async function requestOtp(phoneNumber: string): Promise<OtpRequestResponse> {
  return apiClient<OtpRequestResponse>('/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  })
}

export async function verifyOtp(phoneNumber: string, code: string): Promise<AuthTokenResponse> {
  return apiClient<AuthTokenResponse>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, code }),
  })
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokenResponse> {
  return apiClient<AuthTokenResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}

export interface DevResident {
  residentId: string
  name: string
  phone: string
  unitId: string
  unitNumber: string
  siteName: string
}

export interface DevBootstrapResponse {
  ready: boolean
  tenantId?: string
  tenantName?: string
  tenantSlug?: string
  message?: string
  devResident?: DevResident | null
}

export async function getDevBootstrap(): Promise<DevBootstrapResponse> {
  return apiClient<DevBootstrapResponse>('/auth/dev-bootstrap')
}
