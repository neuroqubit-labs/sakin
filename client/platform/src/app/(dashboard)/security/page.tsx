'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/lib/api'

type AuditAction =
  | 'TENANT_CREATED'
  | 'TENANT_UPDATED'
  | 'TENANT_SUSPENDED'
  | 'TENANT_ACTIVATED'
  | 'TENANT_PLAN_UPDATED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'PLATFORM_SETTING_UPDATED'

const ACTION_LABEL: Record<AuditAction, string> = {
  TENANT_CREATED: 'Şirket oluşturuldu',
  TENANT_UPDATED: 'Şirket güncellendi',
  TENANT_SUSPENDED: 'Askıya alındı',
  TENANT_ACTIVATED: 'Aktifleştirildi',
  TENANT_PLAN_UPDATED: 'Plan güncellendi',
  LOGIN_SUCCESS: 'Giriş başarılı',
  LOGIN_FAILED: 'Giriş başarısız',
  PLATFORM_SETTING_UPDATED: 'Sistem ayarı değişti',
}

const ACTION_CLASS: Record<AuditAction, string> = {
  TENANT_CREATED: 'bg-green-100 text-green-700',
  TENANT_UPDATED: 'bg-blue-100 text-blue-700',
  TENANT_SUSPENDED: 'bg-red-100 text-red-700',
  TENANT_ACTIVATED: 'bg-green-100 text-green-700',
  TENANT_PLAN_UPDATED: 'bg-indigo-100 text-indigo-700',
  LOGIN_SUCCESS: 'bg-gray-100 text-gray-700',
  LOGIN_FAILED: 'bg-red-100 text-red-700',
  PLATFORM_SETTING_UPDATED: 'bg-purple-100 text-purple-700',
}

interface AuditLogRow {
  id: string
  tenantId: string | null
  userId: string
  action: AuditAction
  entity: string
  entityId: string
  ipAddress: string | null
  userAgent: string | null
  changes: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  createdAt: string
  actor: { id: string; email: string | null; displayName: string | null } | null
}

interface AuditLogResponse {
  data: AuditLogRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

interface Filters {
  from: string
  to: string
  action: AuditAction | ''
  actorUserId: string
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function SecurityPage() {
  const [filters, setFilters] = useState<Filters>({ from: '', to: '', action: '', actorUserId: '' })
  const [page, setPage] = useState(1)
  const [res, setRes] = useState<AuditLogResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryParams = useMemo(() => {
    const params: Record<string, string | number | boolean> = { page, limit: 50 }
    if (filters.from) params.from = new Date(filters.from).toISOString()
    if (filters.to) params.to = new Date(filters.to).toISOString()
    if (filters.action) params.action = filters.action
    if (filters.actorUserId) params.actorUserId = filters.actorUserId
    return params
  }, [filters, page])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient<AuditLogResponse>('/platform/audit-logs', { params: queryParams })
      setRes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıtlar alınamadı')
    } finally {
      setLoading(false)
    }
  }, [queryParams])

  useEffect(() => {
    void load()
  }, [load])

  const last24hStats = useLast24hStats()

  function resetFilters() {
    setFilters({ from: '', to: '', action: '', actorUserId: '' })
    setPage(1)
  }

  const rows = res?.data ?? []
  const meta = res?.meta

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Güvenlik &amp; Log Merkezi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Platform genelindeki kimlik doğrulama, yönetim ve ayar değişiklik kayıtları.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-gray-500">Son 24s Kritik Olay</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-700">{last24hStats.loginFailed}</p>
            <p className="text-xs text-gray-500 mt-1">Başarısız giriş denemesi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-gray-500">Son 24s Başarılı Giriş</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{last24hStats.loginSuccess}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-gray-500">Son 24s Tekil IP</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{last24hStats.uniqueIps}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-gray-500">Son 24s Toplam İşlem</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{last24hStats.total}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Başlangıç</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => {
              setFilters((f) => ({ ...f, from: e.target.value }))
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Bitiş</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => {
              setFilters((f) => ({ ...f, to: e.target.value }))
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Aksiyon</label>
          <select
            value={filters.action}
            onChange={(e) => {
              setFilters((f) => ({ ...f, action: e.target.value as AuditAction | '' }))
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-[200px]"
          >
            <option value="">Tümü</option>
            {(Object.keys(ACTION_LABEL) as AuditAction[]).map((a) => (
              <option key={a} value={a}>
                {ACTION_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Kullanıcı ID</label>
          <input
            type="text"
            value={filters.actorUserId}
            onChange={(e) => {
              setFilters((f) => ({ ...f, actorUserId: e.target.value }))
              setPage(1)
            }}
            placeholder="uuid"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-mono w-[260px]"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={resetFilters}
            className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            Sıfırla
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            Kayıtlar {meta ? <span className="text-gray-400 font-normal">({meta.total.toLocaleString('tr-TR')})</span> : null}
          </h3>
        </div>

        <div className="p-4">
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          {loading && <p className="text-sm text-gray-500">Yükleniyor...</p>}

          {!loading && rows.length === 0 && <p className="text-sm text-gray-500">Seçilen kriterlerde kayıt yok.</p>}

          {!loading && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Tarih</th>
                    <th className="px-3 py-2 text-left">Aksiyon</th>
                    <th className="px-3 py-2 text-left">Kullanıcı</th>
                    <th className="px-3 py-2 text-left">Varlık</th>
                    <th className="px-3 py-2 text-left">IP</th>
                    <th className="px-3 py-2 text-left">Tarayıcı</th>
                    <th className="px-3 py-2 text-left">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 align-top">
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">{formatDateTime(row.createdAt)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${ACTION_CLASS[row.action] ?? 'bg-gray-100 text-gray-700'}`}>
                          {ACTION_LABEL[row.action] ?? row.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {row.actor?.displayName ?? row.actor?.email ?? (
                          <span className="text-gray-400">—</span>
                        )}
                        {row.actor?.email && row.actor?.displayName && (
                          <div className="text-xs text-gray-400">{row.actor.email}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600 font-mono text-xs">
                        {row.entity}
                        {row.entityId && row.entityId !== 'platform' && (
                          <div className="text-gray-400">{row.entityId.slice(0, 8)}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600 font-mono text-xs">{row.ipAddress ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs max-w-[180px] truncate" title={row.userAgent ?? ''}>
                        {row.userAgent ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        <ChangesCell changes={row.changes} metadata={row.metadata} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-xs text-gray-500">
                Sayfa {meta.page} / {meta.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50"
                >
                  Önceki
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= meta.totalPages}
                  className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 hover:bg-gray-50"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChangesCell({
  changes,
  metadata,
}: {
  changes: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
}) {
  const payload = changes ?? metadata
  if (!payload || Object.keys(payload).length === 0) {
    return <span className="text-gray-300 text-xs">—</span>
  }
  const entries = Object.entries(payload).slice(0, 3)
  return (
    <div className="text-xs text-gray-600 space-y-0.5">
      {entries.map(([k, v]) => (
        <div key={k} className="truncate max-w-[220px]" title={JSON.stringify(v)}>
          <span className="text-gray-400">{k}:</span>{' '}
          <span className="font-mono">{formatValue(v)}</span>
        </div>
      ))}
      {Object.keys(payload).length > 3 && (
        <div className="text-gray-400">+{Object.keys(payload).length - 3} daha</div>
      )}
    </div>
  )
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string') return v.length > 40 ? v.slice(0, 40) + '…' : v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v).slice(0, 40)
}

function useLast24hStats() {
  const [stats, setStats] = useState({ loginFailed: 0, loginSuccess: 0, uniqueIps: 0, total: 0 })

  useEffect(() => {
    void (async () => {
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const res = await apiClient<AuditLogResponse>('/platform/audit-logs', {
          params: { from: since, page: 1, limit: 100 },
        })
        const rows = res.data
        const loginFailed = rows.filter((r) => r.action === 'LOGIN_FAILED').length
        const loginSuccess = rows.filter((r) => r.action === 'LOGIN_SUCCESS').length
        const ips = new Set(rows.map((r) => r.ipAddress).filter((v): v is string => !!v))
        setStats({
          loginFailed,
          loginSuccess,
          uniqueIps: ips.size,
          total: res.meta.total,
        })
      } catch {
        // sessiz
      }
    })()
  }, [])

  return stats
}
