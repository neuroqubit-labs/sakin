'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api'

type PlanType = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

interface TenantPlan {
  planType: PlanType
  expiresAt: string | null
  maxUnits: number
  smsCredits: number
}

interface TenantListItem {
  id: string
  name: string
  slug: string
  city: string
  contactEmail: string
  contactPhone: string
  isActive: boolean
  suspendedAt: string | null
  suspendedReason: string | null
  createdAt: string
  plan: TenantPlan | null
  daysUntilExpiry: number | null
  _count: { sites: number; users: number; units: number }
}

interface TenantListResponse {
  data: TenantListItem[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

interface CreateResult {
  id: string
  name: string
  slug: string
  initialAdmin: {
    email: string
    displayName: string
    tempPassword: string | null
  }
}

const emptyForm = {
  name: '',
  slug: '',
  contactEmail: '',
  contactPhone: '',
  city: '',
  address: '',
  adminEmail: '',
  adminDisplayName: '',
}

const PAGE_SIZE = 20

type StatusFilter = 'ALL' | 'ACTIVE' | 'SUSPENDED'
type PlanFilter = 'ALL' | PlanType

export default function CompaniesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Şirketler yükleniyor...</p>}>
      <CompaniesPageInner />
    </Suspense>
  )
}

function CompaniesPageInner() {
  const searchParams = useSearchParams()
  const initialPlan = (searchParams.get('planType') as PlanFilter) ?? 'ALL'

  const [tenants, setTenants] = useState<TenantListItem[]>([])
  const [meta, setMeta] = useState<TenantListResponse['meta'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [plan, setPlan] = useState<PlanFilter>(initialPlan)
  const [page, setPage] = useState(1)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [createResult, setCreateResult] = useState<CreateResult | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string | number | boolean> = {
        page,
        limit: PAGE_SIZE,
      }
      if (search) params.search = search
      if (status === 'ACTIVE') params.isActive = true
      if (status === 'SUSPENDED') params.isActive = false
      if (plan !== 'ALL') params.planType = plan

      const response = await apiClient<TenantListResponse>('/platform/tenants', { params })
      setTenants(response.data)
      setMeta(response.meta)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Şirket listesi alınamadı')
    } finally {
      setLoading(false)
    }
  }, [page, search, status, plan])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput.trim())
        setPage(1)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput, search])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        city: form.city.trim(),
        address: form.address.trim() || undefined,
        admin: {
          email: form.adminEmail.trim(),
          displayName: form.adminDisplayName.trim(),
        },
      }
      const result = await apiClient<CreateResult>('/platform/tenants', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setCreateResult(result)
      setForm(emptyForm)
      void load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Şirket oluşturulamadı')
    } finally {
      setSubmitting(false)
    }
  }

  function copyPassword(value: string) {
    void navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Şirketler</h1>
          <p className="text-sm text-gray-500 mt-1">Tenant yönetimi, plan ve askıya alma.</p>
        </div>
        <button
          onClick={() => {
            setShowForm((v) => !v)
            setCreateResult(null)
            setFormError(null)
          }}
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800"
        >
          {showForm ? 'Kapat' : '+ Yeni Şirket'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          {createResult ? (
            <div className="space-y-4">
              <div className="rounded-md border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-800">
                  {createResult.name} oluşturuldu ve ilk yönetici atandı.
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Admin: {createResult.initialAdmin.displayName} ({createResult.initialAdmin.email})
                </p>
              </div>

              {createResult.initialAdmin.tempPassword ? (
                <div>
                  <p className="text-xs text-gray-600 mb-2">
                    Aşağıdaki geçici şifreyi yöneticiye güvenli biçimde iletin.
                  </p>
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md">
                    <code className="flex-1 text-xs font-mono text-gray-900">{createResult.initialAdmin.tempPassword}</code>
                    <button
                      type="button"
                      onClick={() => copyPassword(createResult.initialAdmin.tempPassword!)}
                      className="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-50"
                    >
                      {copied ? 'Kopyalandı' : 'Kopyala'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-600">
                  Bu e-posta zaten sistemde kayıtlıydı. Mevcut şifresiyle giriş yapabilir.
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreateResult(null)
                  }}
                  className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
                >
                  Yeni Şirket Oluştur
                </button>
                <Link
                  href={`/companies/${createResult.id}`}
                  className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800"
                >
                  Detayı Aç
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Şirket Adı" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
                <Field
                  label="Slug (URL)"
                  hint="küçük harf, rakam, tire"
                  value={form.slug}
                  onChange={(v) => setForm((f) => ({ ...f, slug: v }))}
                  required
                />
                <Field label="İletişim E-posta" type="email" value={form.contactEmail} onChange={(v) => setForm((f) => ({ ...f, contactEmail: v }))} required />
                <Field label="İletişim Telefon" value={form.contactPhone} onChange={(v) => setForm((f) => ({ ...f, contactPhone: v }))} required />
                <Field label="Şehir" value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} required />
                <Field label="Adres" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} />
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">İlk Yönetici (TENANT_ADMIN)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Ad Soyad" value={form.adminDisplayName} onChange={(v) => setForm((f) => ({ ...f, adminDisplayName: v }))} required />
                  <Field label="E-posta" type="email" value={form.adminEmail} onChange={(v) => setForm((f) => ({ ...f, adminEmail: v }))} required />
                </div>
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50"
                >
                  {submitting ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="text-xs font-medium text-gray-700 block mb-1">Arama</label>
          <input
            type="search"
            placeholder="Şirket adı, slug, e-posta veya telefon"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Durum</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="ALL">Tümü</option>
            <option value="ACTIVE">Aktif</option>
            <option value="SUSPENDED">Askıda</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Plan</label>
          <select
            value={plan}
            onChange={(e) => {
              setPlan(e.target.value as PlanFilter)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="ALL">Tümü</option>
            <option value="TRIAL">Deneme</option>
            <option value="STARTER">Başlangıç</option>
            <option value="PROFESSIONAL">Pro</option>
            <option value="ENTERPRISE">Kurumsal</option>
          </select>
        </div>
        {meta && (
          <p className="text-xs text-gray-500 ml-auto">
            Toplam {meta.total} kayıt · sayfa {meta.page}/{Math.max(meta.totalPages, 1)}
          </p>
        )}
      </div>

      {loading && <p className="text-sm text-gray-500">Şirketler yükleniyor...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && tenants.length === 0 && (
        <p className="text-sm text-gray-500">Filtrelere uyan şirket bulunamadı.</p>
      )}

      {!loading && !error && tenants.length > 0 && (
        <>
          <div className="bg-white rounded-lg shadow divide-y">
            {tenants.map((tenant) => (
              <Link
                key={tenant.id}
                href={`/companies/${tenant.id}`}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {tenant.city} · {tenant._count.sites} site · {tenant._count.units} daire · {tenant._count.users} kullanıcı
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PlanChip plan={tenant.plan} daysUntilExpiry={tenant.daysUntilExpiry} />
                  <StatusChip isActive={tenant.isActive} suspendedReason={tenant.suspendedReason} />
                </div>
              </Link>
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                ← Önceki
              </button>
              <span className="text-xs text-gray-500">
                Sayfa {meta.page} / {meta.totalPages}
              </span>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Sonraki →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  hint?: string
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
      />
      {hint && <span className="text-[11px] text-gray-400 mt-0.5 block">{hint}</span>}
    </label>
  )
}

function PlanChip({ plan, daysUntilExpiry }: { plan: TenantPlan | null; daysUntilExpiry: number | null }) {
  if (!plan) return null

  const planLabel: Record<TenantPlan['planType'], string> = {
    TRIAL: 'Deneme',
    STARTER: 'Başlangıç',
    PROFESSIONAL: 'Pro',
    ENTERPRISE: 'Kurumsal',
  }

  const isTrial = plan.planType === 'TRIAL'
  const expired = daysUntilExpiry !== null && daysUntilExpiry <= 0
  const warning = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 7

  if (expired) {
    return <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">Süre doldu</span>
  }
  if (isTrial && daysUntilExpiry !== null) {
    return (
      <span
        className={`text-xs px-2 py-1 rounded ${warning ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'}`}
      >
        Deneme · {daysUntilExpiry} gün
      </span>
    )
  }
  return <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">{planLabel[plan.planType]}</span>
}

function StatusChip({ isActive, suspendedReason }: { isActive: boolean; suspendedReason: string | null }) {
  if (isActive) {
    return <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Aktif</span>
  }
  return (
    <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700" title={suspendedReason ?? undefined}>
      Askıda
    </span>
  )
}
