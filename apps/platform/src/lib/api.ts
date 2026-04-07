import { auth } from './firebase'

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

async function getToken(): Promise<string | null> {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

export async function apiClient<T>(path: string, options: FetchOptions = {}): Promise<T> {
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
    ...(fetchOptions.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, { ...fetchOptions, headers })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Bilinmeyen hata' }))
    throw new Error((error as { message: string }).message ?? 'API hatası')
  }

  const json = await response.json() as { data: T }
  return json.data
}

