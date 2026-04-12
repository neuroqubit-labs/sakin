'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@sakin/ui'
import { apiClient } from '@/lib/api'

interface PlatformStats {
  totalTenants: number
  activeTenants: number
  totalSites: number
  totalUsers: number
  totalDues: number
  totalPayments: number
}

export default function PlatformDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient<PlatformStats>('/platform/stats')
        setStats(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Platform verisi alınamadı')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) {
    return <p className="text-sm text-gray-500">Platform verisi yükleniyor...</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Genel Durum</h1>
        <p className="text-sm text-gray-500 mt-1">Şirketlerin global performans özeti.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Toplam Şirket</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats?.totalTenants ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Aktif Şirket</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats?.activeTenants ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Toplam Site</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats?.totalSites ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Toplam Kullanıcı</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats?.totalUsers ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Toplam Aidat Kaydı</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats?.totalDues ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Toplam Ödeme</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats?.totalPayments ?? 0}</p></CardContent>
        </Card>
      </div>
    </div>
  )
}

