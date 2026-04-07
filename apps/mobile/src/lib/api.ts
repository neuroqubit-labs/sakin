import auth from '@react-native-firebase/auth'

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

async function getToken(): Promise<string | null> {
  const user = auth().currentUser
  if (!user) return null
  try {
    return await user.getIdToken()
  } catch {
    return null
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
  }

  const response = await fetch(url, { ...fetchOptions, headers })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Bilinmeyen hata' }))
    throw new Error((errorBody as { message?: string }).message ?? `HTTP ${response.status}`)
  }

  const json = (await response.json()) as { data: T }
  return json.data
}

export interface RegisterResponse {
  userId: string
  tenantId: string | null
  role: string
}

export async function registerUser(): Promise<RegisterResponse | null> {
  const user = auth().currentUser
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
