'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

interface TenantListResponse {
  data: Array<{
    id: string
    name: string
    city: string
    isActive: boolean
  }>
  meta: { total: number }
}

export default function CompaniesPage() {
  const [tenants, setTenants] = useState<TenantListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient<TenantListResponse>('/platform/tenants', {
          params: { page: 1, limit: 20 },
        })
        setTenants(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Şirket listesi alınamadı')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Şirketler</h1>
        <p className="text-sm text-gray-500 mt-1">Tenant yönetimi ve aktivasyon takibi.</p>
      </div>

      {loading && <p className="text-sm text-gray-500">Şirketler yükleniyor...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow divide-y">
          {tenants?.data.map((tenant) => (
            <div key={tenant.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                <p className="text-xs text-gray-500">{tenant.city}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${tenant.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {tenant.isActive ? 'Aktif' : 'Pasif'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

