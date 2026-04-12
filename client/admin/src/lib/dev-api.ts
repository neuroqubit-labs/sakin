import { apiClient, getDevTenantId, setDevTenantId } from './api'

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

export { getDevTenantId, setDevTenantId }

export async function devApiClient<T>(path: string, options: FetchOptions = {}): Promise<T> {
  return apiClient<T>(path, options)
}
