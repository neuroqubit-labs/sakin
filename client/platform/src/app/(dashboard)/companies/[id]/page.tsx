'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { apiClient } from '@/lib/api'

type PlanType = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

interface TenantPlan {
  planType: PlanType
  expiresAt: string | null
  maxUnits: number
  smsCredits: number
}

interface TenantDetail {
  id: string
  name: string
  slug: string
  city: string
  address: string | null
  contactEmail: string
  contactPhone: string
  isActive: boolean
  suspendedAt: string | null
  suspendedReason: string | null
  suspendedBy: string | null
  activityNotes: string | null
  createdAt: string
  plan: TenantPlan | null
  daysUntilExpiry: number | null
  _count: { sites: number; users: number; dues: number }
}

const PLAN_LABELS: Record<PlanType, string> = {
  TRIAL: 'Deneme',
  STARTER: 'Başlangıç',
  PROFESSIONAL: 'Profesyonel',
  ENTERPRISE: 'Kurumsal',
}

interface AuditLogRow {
  id: string
  action: string
  changes: Record<string, unknown> | null
  createdAt: string
  actor: { id: string; email: string | null; displayName: string | null } | null
}

interface AuditLogResponse {
  data: AuditLogRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

const ACTION_LABELS: Record<string, string> = {
  TENANT_CREATED: 'Şirket oluşturuldu',
  TENANT_UPDATED: 'Bilgiler güncellendi',
  TENANT_SUSPENDED: 'Askıya alındı',
  TENANT_ACTIVATED: 'Aktifleştirildi',
  TENANT_PLAN_UPDATED: 'Plan güncellendi',
}

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const [suspendMode, setSuspendMode] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')

  const [planForm, setPlanForm] = useState({ planType: 'TRIAL' as PlanType, smsCredits: 0, maxUnits: 50, expiresAt: '' })
  const [activityNotes, setActivityNotes] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [data, auditRes] = await Promise.all([
        apiClient<TenantDetail>(`/platform/tenants/${id}`),
        apiClient<AuditLogResponse>('/platform/audit-logs', { params: { tenantId: id, page: 1, limit: 20 } }),
      ])
      setTenant(data)
      setAuditLogs(auditRes.data)
      setActivityNotes(data.activityNotes ?? '')
      if (data.plan) {
        setPlanForm({
          planType: data.plan.planType,
          smsCredits: data.plan.smsCredits,
          maxUnits: data.plan.maxUnits,
          expiresAt: data.plan.expiresAt ? data.plan.expiresAt.slice(0, 10) : '',
        })
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tenant bulunamadı')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  function flashSuccess(msg: string) {
    setActionSuccess(msg)
    setActionError(null)
    setTimeout(() => setActionSuccess(null), 3000)
  }

  async function handleSuspend() {
    if (suspendReason.trim().length < 3) {
      setActionError('Lütfen en az 3 karakterlik bir sebep girin')
      return
    }
    try {
      await apiClient(`/platform/tenants/${id}/deactivate`, {
        method: 'POST',
        body: JSON.stringify({ reason: suspendReason.trim() }),
      })
      setSuspendMode(false)
      setSuspendReason('')
      flashSuccess('Şirket askıya alındı.')
      void load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Askıya alınamadı')
    }
  }

  async function handleActivate() {
    try {
      await apiClient(`/platform/tenants/${id}/activate`, { method: 'POST' })
      flashSuccess('Şirket aktifleştirildi.')
      void load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Aktifleştirilemedi')
    }
  }

  async function handlePlanUpdate(e: React.FormEvent) {
    e.preventDefault()
    try {
      await apiClient(`/platform/tenants/${id}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({
          planType: planForm.planType,
          smsCredits: planForm.smsCredits,
          maxUnits: planForm.maxUnits,
          expiresAt: planForm.expiresAt ? new Date(planForm.expiresAt).toISOString() : null,
        }),
      })
      flashSuccess('Plan güncellendi.')
      void load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Plan güncellenemedi')
    }
  }

  async function handleNotesSave() {
    try {
      await apiClient(`/platform/tenants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activityNotes: activityNotes.trim() || null }),
      })
      flashSuccess('Notlar kaydedildi.')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Notlar kaydedilemedi')
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!tenant) return null

  return (
    <div className="space-y-6">
      <div>
        <Link href="/companies" className="text-xs text-gray-500 hover:text-gray-900">← Şirketler</Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
            <p className="text-sm text-gray-500">{tenant.slug} · {tenant.city}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge isActive={tenant.isActive} />
            {tenant.isActive ? (
              <button
                onClick={() => setSuspendMode(true)}
                className="text-xs px-3 py-1.5 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
              >
                Askıya Al
              </button>
            ) : (
              <button
                onClick={handleActivate}
                className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Aktifleştir
              </button>
            )}
          </div>
        </div>
      </div>

      {actionSuccess && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded">{actionSuccess}</p>}
      {actionError && <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded">{actionError}</p>}

      {suspendMode && (
        <div className="bg-white rounded-lg shadow p-6 space-y-3">
          <h3 className="text-sm font-semibold">Askıya alma sebebi</h3>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Örn: Ödeme gecikmesi, müşteri talebi..."
          />
          <div className="flex gap-2">
            <button onClick={handleSuspend} className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700">
              Askıya Al
            </button>
            <button
              onClick={() => {
                setSuspendMode(false)
                setSuspendReason('')
              }}
              className="px-4 py-2 border text-sm rounded-md hover:bg-gray-50"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {!tenant.isActive && tenant.suspendedReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-red-800">Askıya alma sebebi</p>
          <p className="text-sm text-red-700 mt-1">{tenant.suspendedReason}</p>
          {tenant.suspendedAt && (
            <p className="text-[11px] text-red-600 mt-1">Tarih: {new Date(tenant.suspendedAt).toLocaleString('tr-TR')}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Site" value={tenant._count.sites} />
        <Stat label="Kullanıcı" value={tenant._count.users} />
        <Stat label="Aidat Kaydı" value={tenant._count.dues} />
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Plan</h2>
        <form onSubmit={handlePlanUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-700">Plan Tipi</span>
            <select
              value={planForm.planType}
              onChange={(e) => setPlanForm((f) => ({ ...f, planType: e.target.value as PlanType }))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {Object.entries(PLAN_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-700">Bitiş Tarihi</span>
            <input
              type="date"
              value={planForm.expiresAt}
              onChange={(e) => setPlanForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-700">SMS Kredisi</span>
            <input
              type="number"
              min={0}
              value={planForm.smsCredits}
              onChange={(e) => setPlanForm((f) => ({ ...f, smsCredits: Number(e.target.value) }))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-700">Max Daire</span>
            <input
              type="number"
              min={1}
              value={planForm.maxUnits}
              onChange={(e) => setPlanForm((f) => ({ ...f, maxUnits: Number(e.target.value) }))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800">
              Planı Kaydet
            </button>
            {tenant.daysUntilExpiry !== null && (
              <span className="ml-3 text-xs text-gray-500">
                {tenant.daysUntilExpiry > 0
                  ? `${tenant.daysUntilExpiry} gün kaldı`
                  : 'Süresi doldu'}
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">İletişim</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <InfoRow label="E-posta" value={tenant.contactEmail} />
          <InfoRow label="Telefon" value={tenant.contactPhone} />
          <InfoRow label="Şehir" value={tenant.city} />
          <InfoRow label="Adres" value={tenant.address ?? '-'} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Operasyonel Notlar</h2>
        <textarea
          value={activityNotes}
          onChange={(e) => setActivityNotes(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          placeholder="İç ekip için notlar (ör: müşteri tercihleri, özel anlaşmalar...)"
        />
        <button onClick={handleNotesSave} className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800">
          Notları Kaydet
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">İşlem Geçmişi</h2>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-gray-500">Bu şirket için işlem kaydı bulunamadı.</p>
        ) : (
          <ul className="divide-y">
            {auditLogs.map((log) => (
              <li key={log.id} className="py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{ACTION_LABELS[log.action] ?? log.action}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {log.actor?.displayName ?? log.actor?.email ?? 'Bilinmeyen kullanıcı'}
                    </p>
                    {log.changes && Object.keys(log.changes).length > 0 && (
                      <pre className="mt-2 bg-gray-50 text-[11px] text-gray-700 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`text-xs px-2 py-1 rounded ${
        isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {isActive ? 'Aktif' : 'Askıda'}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}
