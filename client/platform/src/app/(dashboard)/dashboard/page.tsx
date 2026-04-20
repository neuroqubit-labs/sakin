'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/lib/api'

type PlanType = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

interface RecentTenant {
  id: string
  name: string
  slug: string
  city: string
  createdAt: string
  isActive: boolean
  plan: { planType: PlanType; expiresAt: string | null } | null
}

interface PlatformStats {
  tenants: { total: number; active: number; suspended: number }
  users: { total: number; tenantScoped: number }
  sites: { total: number }
  units: { total: number }
  paymentsThisMonth: { count: number; totalAmount: number }
  plans: {
    distribution: Partial<Record<PlanType, number>>
    expiringIn7Days: number
    expiringIn30Days: number
    expired: number
  }
  sms: { totalCredits: number }
  recentTenants: RecentTenant[]
}

interface AuditLogRow {
  id: string
  tenantId: string | null
  userId: string
  action: string
  entity: string
  entityId: string
  createdAt: string
  actor: { id: string; email: string | null; displayName: string | null } | null
}

interface AuditLogResponse {
  data: AuditLogRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

const PLAN_LABELS: Record<PlanType, string> = {
  TRIAL: 'Deneme',
  STARTER: 'Başlangıç',
  PROFESSIONAL: 'Pro',
  ENTERPRISE: 'Kurumsal',
}

const ACTION_LABELS: Record<string, string> = {
  TENANT_CREATED: 'Şirket oluşturuldu',
  TENANT_UPDATED: 'Şirket güncellendi',
  TENANT_SUSPENDED: 'Askıya alındı',
  TENANT_ACTIVATED: 'Aktifleştirildi',
  TENANT_PLAN_UPDATED: 'Plan güncellendi',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount)
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function PlatformDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [audit, setAudit] = useState<AuditLogRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, auditRes] = await Promise.all([
          apiClient<PlatformStats>('/platform/stats'),
          apiClient<AuditLogResponse>('/platform/audit-logs', { params: { page: 1, limit: 8 } }),
        ])
        setStats(statsRes)
        setAudit(auditRes.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Platform verisi alınamadı')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) return <p className="text-sm text-gray-500">Platform verisi yükleniyor...</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!stats) return null

  const planTotal = Object.values(stats.plans.distribution).reduce((s, v) => s + (v ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Genel Durum</h1>
        <p className="text-sm text-gray-500 mt-1">Şirketlerin global performans özeti.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          title="Kayıtlı Şirket"
          value={stats.tenants.total}
          hint={`${stats.tenants.active} aktif · ${stats.tenants.suspended} askıda`}
        />
        <Kpi title="Toplam Site" value={stats.sites.total} hint={`${stats.units.total} daire`} />
        <Kpi
          title="Bu Ay Tahsilat"
          value={formatCurrency(Number(stats.paymentsThisMonth.totalAmount ?? 0))}
          hint={`${stats.paymentsThisMonth.count} işlem`}
        />
        <Kpi
          title="SMS Kredisi"
          value={stats.sms.totalCredits.toLocaleString('tr-TR')}
          hint="Tüm tenantlar toplamı"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-gray-700">Lisans Durumu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert
              tone="red"
              label="Süresi dolmuş"
              value={stats.plans.expired}
              href="/companies"
              hidden={stats.plans.expired === 0}
            />
            <Alert
              tone="amber"
              label="7 gün içinde bitecek"
              value={stats.plans.expiringIn7Days}
              href="/companies"
              hidden={stats.plans.expiringIn7Days === 0}
            />
            <Alert
              tone="blue"
              label="30 gün içinde bitecek"
              value={stats.plans.expiringIn30Days}
              href="/companies"
              hidden={stats.plans.expiringIn30Days === 0}
            />
            {stats.plans.expired === 0 &&
              stats.plans.expiringIn7Days === 0 &&
              stats.plans.expiringIn30Days === 0 && (
                <p className="text-sm text-gray-500">Önümüzdeki 30 gün içinde süresi dolan plan yok.</p>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-700">Plan Dağılımı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as PlanType[]).map((p) => {
              const count = stats.plans.distribution[p] ?? 0
              const pct = planTotal > 0 ? Math.round((count / planTotal) * 100) : 0
              return (
                <div key={p} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{PLAN_LABELS[p]}</span>
                  <span className="text-gray-500">
                    <span className="font-medium text-gray-900">{count}</span>
                    <span className="ml-2 text-xs text-gray-400">({pct}%)</span>
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-700">Son Eklenen Şirketler</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentTenants.length === 0 ? (
              <p className="text-sm text-gray-500">Henüz şirket yok.</p>
            ) : (
              <ul className="divide-y">
                {stats.recentTenants.map((t) => (
                  <li key={t.id} className="py-2 flex items-center justify-between">
                    <Link href={`/companies/${t.id}`} className="flex-1">
                      <p className="text-sm font-medium text-gray-900 hover:text-gray-700">{t.name}</p>
                      <p className="text-xs text-gray-500">
                        {t.city} · {formatDateTime(t.createdAt)}
                      </p>
                    </Link>
                    {t.plan && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {PLAN_LABELS[t.plan.planType]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-700">Son İşlem Geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            {!audit || audit.length === 0 ? (
              <p className="text-sm text-gray-500">Henüz işlem kaydı yok.</p>
            ) : (
              <ul className="divide-y">
                {audit.map((log) => (
                  <li key={log.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900">{ACTION_LABELS[log.action] ?? log.action}</span>
                      <span className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {log.actor?.displayName ?? log.actor?.email ?? 'Bilinmeyen kullanıcı'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-gray-700">Hızlı Aksiyonlar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/companies" className="px-3 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800">
            + Yeni Şirket
          </Link>
          <Link href="/companies" className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50">
            Şirket Listesi
          </Link>
          <Link href="/plans" className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50">
            Plan Yönetimi
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({ title, value, hint }: { title: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      </CardContent>
    </Card>
  )
}

function Alert({
  tone,
  label,
  value,
  href,
  hidden,
}: {
  tone: 'red' | 'amber' | 'blue'
  label: string
  value: number
  href: string
  hidden?: boolean
}) {
  if (hidden) return null
  const styles = {
    red: 'bg-red-50 border-red-200 text-red-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
  }
  return (
    <Link
      href={href}
      className={`border rounded-md px-3 py-2 text-sm flex items-center justify-between hover:opacity-90 ${styles[tone]}`}
    >
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </Link>
  )
}
