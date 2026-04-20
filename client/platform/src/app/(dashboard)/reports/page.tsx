'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient, downloadFile } from '@/lib/api'

type ReportTab = 'tenant-status' | 'license' | 'sms-usage' | 'system-activity' | 'health-errors'

const TABS: { key: ReportTab; label: string }[] = [
  { key: 'tenant-status', label: 'Firma Durumu' },
  { key: 'license', label: 'Lisans' },
  { key: 'sms-usage', label: 'SMS Kullanımı' },
  { key: 'system-activity', label: 'Sistem Aktivite' },
  { key: 'health-errors', label: 'Hata & Sağlık' },
]

interface TenantOption {
  id: string
  name: string
}

interface TenantListResponse {
  data: TenantOption[]
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'SUSPENDED'

interface Filters {
  from: string
  to: string
  tenantId: string
  status: StatusFilter
}

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('tenant-status')
  const [filters, setFilters] = useState<Filters>({ from: '', to: '', tenantId: '', status: 'ALL' })
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiClient<TenantListResponse>('/platform/tenants', {
          params: { page: 1, limit: 100 },
        })
        setTenants(res.data)
      } catch {
        // sessiz: filtre dropdown'u boş kalır
      }
    })()
  }, [])

  const queryParams = useMemo(() => {
    const params: Record<string, string | number | boolean> = {}
    if (filters.from) params.from = new Date(filters.from).toISOString()
    if (filters.to) params.to = new Date(filters.to).toISOString()
    if (filters.tenantId) params.tenantId = filters.tenantId
    if (filters.status === 'ACTIVE') params.isActive = true
    if (filters.status === 'SUSPENDED') params.isActive = false
    return params
  }, [filters])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiClient<unknown>(`/platform/reports/${tab}`, { params: queryParams })
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rapor alınamadı')
    } finally {
      setLoading(false)
    }
  }, [tab, queryParams])

  useEffect(() => {
    void load()
  }, [load])

  async function handleExport() {
    try {
      await downloadFile(
        `/platform/reports/${tab}/export.csv`,
        `${tab}-${new Date().toISOString().slice(0, 10)}.csv`,
        queryParams,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV indirilemedi')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sistem Raporları</h1>
        <p className="text-sm text-gray-500 mt-1">Firma, lisans, SMS, aktivite ve sağlık raporları.</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Başlangıç</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Bitiş</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Şirket</label>
          <select
            value={filters.tenantId}
            onChange={(e) => setFilters((f) => ({ ...f, tenantId: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-[200px]"
          >
            <option value="">Tümü</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Durum</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as StatusFilter }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="ALL">Tümü</option>
            <option value="ACTIVE">Aktif</option>
            <option value="SUSPENDED">Askıda</option>
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setFilters({ from: '', to: '', tenantId: '', status: 'ALL' })}
            className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            Sıfırla
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800"
          >
            CSV İndir
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b flex">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          {loading && <p className="text-sm text-gray-500">Yükleniyor...</p>}
          {!loading && data !== null && <ReportBody tab={tab} data={data} />}
        </div>
      </div>
    </div>
  )
}

function ReportBody({ tab, data }: { tab: ReportTab; data: unknown }) {
  switch (tab) {
    case 'tenant-status':
      return <TenantStatusTable rows={data as TenantStatusRow[]} />
    case 'license':
      return <LicenseTable rows={data as LicenseRow[]} />
    case 'sms-usage':
      return <SmsUsageTable rows={data as SmsUsageRow[]} />
    case 'system-activity':
      return <SystemActivityView data={data as SystemActivityData} />
    case 'health-errors':
      return <HealthErrorsView data={data as HealthErrorsData} />
    default:
      return null
  }
}

interface TenantStatusRow {
  id: string
  name: string
  city: string
  isActive: boolean
  planType: string | null
  sites: number
  units: number
  users: number
  dues: number
  paymentsCount: number
  paymentsTotal: number
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)
}

function TenantStatusTable({ rows }: { rows: TenantStatusRow[] }) {
  if (!rows?.length) return <p className="text-sm text-gray-500">Kayıt yok.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2 text-left">Şirket</th>
            <th className="px-3 py-2 text-left">Şehir</th>
            <th className="px-3 py-2 text-left">Plan</th>
            <th className="px-3 py-2 text-right">Site</th>
            <th className="px-3 py-2 text-right">Daire</th>
            <th className="px-3 py-2 text-right">Kullanıcı</th>
            <th className="px-3 py-2 text-right">Tahsilat</th>
            <th className="px-3 py-2 text-center">Durum</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
              <td className="px-3 py-2 text-gray-600">{r.city}</td>
              <td className="px-3 py-2 text-gray-600">{r.planType ?? '—'}</td>
              <td className="px-3 py-2 text-right">{r.sites}</td>
              <td className="px-3 py-2 text-right">{r.units}</td>
              <td className="px-3 py-2 text-right">{r.users}</td>
              <td className="px-3 py-2 text-right">
                <span className="text-gray-900 font-medium">{formatCurrency(r.paymentsTotal)}</span>
                <span className="text-xs text-gray-400 ml-1">({r.paymentsCount})</span>
              </td>
              <td className="px-3 py-2 text-center">
                <span className={`text-xs px-2 py-0.5 rounded ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {r.isActive ? 'Aktif' : 'Askıda'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface LicenseRow {
  tenantId: string
  tenantName: string
  city: string
  isActive: boolean
  planType: string
  smsCredits: number
  maxUnits: number
  expiresAt: string | null
  daysLeft: number | null
  state: 'OK' | 'EXPIRING_IN_MONTH' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY'
}

const LICENSE_STATE_LABEL: Record<LicenseRow['state'], { label: string; cls: string }> = {
  OK: { label: 'Normal', cls: 'bg-green-100 text-green-700' },
  EXPIRING_IN_MONTH: { label: '30 gün içinde', cls: 'bg-blue-100 text-blue-700' },
  EXPIRING_SOON: { label: '7 gün içinde', cls: 'bg-amber-100 text-amber-800' },
  EXPIRED: { label: 'Süresi doldu', cls: 'bg-red-100 text-red-700' },
  NO_EXPIRY: { label: 'Süre yok', cls: 'bg-gray-100 text-gray-600' },
}

function LicenseTable({ rows }: { rows: LicenseRow[] }) {
  if (!rows?.length) return <p className="text-sm text-gray-500">Kayıt yok.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2 text-left">Şirket</th>
            <th className="px-3 py-2 text-left">Plan</th>
            <th className="px-3 py-2 text-right">Max Daire</th>
            <th className="px-3 py-2 text-right">SMS</th>
            <th className="px-3 py-2 text-left">Bitiş</th>
            <th className="px-3 py-2 text-right">Kalan</th>
            <th className="px-3 py-2 text-center">Durum</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.tenantId} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{r.tenantName}</td>
              <td className="px-3 py-2">{r.planType}</td>
              <td className="px-3 py-2 text-right">{r.maxUnits}</td>
              <td className="px-3 py-2 text-right">{r.smsCredits.toLocaleString('tr-TR')}</td>
              <td className="px-3 py-2">{r.expiresAt ? new Date(r.expiresAt).toLocaleDateString('tr-TR') : '—'}</td>
              <td className="px-3 py-2 text-right">{r.daysLeft ?? '—'}</td>
              <td className="px-3 py-2 text-center">
                <span className={`text-xs px-2 py-0.5 rounded ${LICENSE_STATE_LABEL[r.state].cls}`}>
                  {LICENSE_STATE_LABEL[r.state].label}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface SmsUsageRow {
  tenantId: string
  tenantName: string
  totalSent: number
  delivered: number
  failed: number
  queued: number
  remainingCredits: number
}

function SmsUsageTable({ rows }: { rows: SmsUsageRow[] }) {
  if (!rows?.length) return <p className="text-sm text-gray-500">Bu dönemde SMS gönderimi yok.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2 text-left">Şirket</th>
            <th className="px-3 py-2 text-right">Toplam</th>
            <th className="px-3 py-2 text-right">Ulaşan</th>
            <th className="px-3 py-2 text-right">Başarısız</th>
            <th className="px-3 py-2 text-right">Kuyrukta</th>
            <th className="px-3 py-2 text-right">Kalan Kredi</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.tenantId} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{r.tenantName}</td>
              <td className="px-3 py-2 text-right">{r.totalSent}</td>
              <td className="px-3 py-2 text-right text-green-700">{r.delivered}</td>
              <td className="px-3 py-2 text-right text-red-700">{r.failed}</td>
              <td className="px-3 py-2 text-right">{r.queued}</td>
              <td className="px-3 py-2 text-right">{r.remainingCredits.toLocaleString('tr-TR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface SystemActivityData {
  total: number
  byAction: Record<string, number>
  recent: Array<{
    id: string
    action: string
    entity: string
    tenantName: string | null
    createdAt: string
    actor: { email: string | null; displayName: string | null } | null
    ipAddress: string | null
  }>
}

function SystemActivityView({ data }: { data: SystemActivityData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader><CardTitle className="text-xs text-gray-500">Toplam İşlem</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{data.total}</p></CardContent>
        </Card>
        {Object.entries(data.byAction).map(([action, count]) => (
          <Card key={action}>
            <CardHeader><CardTitle className="text-xs text-gray-500">{action}</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold">{count}</p></CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Son 100 İşlem</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Tarih</th>
                <th className="px-3 py-2 text-left">Aksiyon</th>
                <th className="px-3 py-2 text-left">Şirket</th>
                <th className="px-3 py-2 text-left">Kullanıcı</th>
                <th className="px-3 py-2 text-left">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.recent.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                    {new Date(r.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-3 py-2">{r.action}</td>
                  <td className="px-3 py-2 text-gray-600">{r.tenantName ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{r.actor?.displayName ?? r.actor?.email ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-400">{r.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

interface HealthErrorsData {
  counts: { failedPayments: number; failedSms: number; suspendedTenants: number; expiredPlans: number }
  recentFailures: Array<{
    id: string
    tenantName: string
    channel: string
    recipient: string
    error: string
    createdAt: string
  }>
}

function HealthErrorsView({ data }: { data: HealthErrorsData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader><CardTitle className="text-xs text-gray-500">Başarısız Ödeme</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-red-700">{data.counts.failedPayments}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs text-gray-500">Başarısız SMS</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-red-700">{data.counts.failedSms}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs text-gray-500">Askıda Tenant</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-amber-700">{data.counts.suspendedTenants}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs text-gray-500">Süresi Dolmuş Lisans</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-amber-700">{data.counts.expiredPlans}</p></CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Son Hatalar</h3>
        {data.recentFailures.length === 0 ? (
          <p className="text-sm text-gray-500">Seçili dönemde iletişim hatası yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Tarih</th>
                  <th className="px-3 py-2 text-left">Şirket</th>
                  <th className="px-3 py-2 text-left">Kanal</th>
                  <th className="px-3 py-2 text-left">Alıcı</th>
                  <th className="px-3 py-2 text-left">Hata</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.recentFailures.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                      {new Date(r.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-3 py-2">{r.tenantName}</td>
                    <td className="px-3 py-2 text-gray-600">{r.channel}</td>
                    <td className="px-3 py-2 text-gray-600">{r.recipient}</td>
                    <td className="px-3 py-2 text-red-700 text-xs">{r.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
