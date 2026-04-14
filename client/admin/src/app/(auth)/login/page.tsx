'use client'

import { useEffect, useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { BrandLockup } from '@/components/brand-lockup'
import { setSessionCookie } from '@/lib/session'
import { getDevTenantId, setDevTenantId, BASE_URL } from '@/lib/api'
import { UserRole } from '@sakin/shared'

interface DevBootstrapResponse {
  ready: boolean
  message?: string
  tenantId?: string
  tenantName?: string
  tenantSlug?: string
  stats?: {
    siteCount: number
    unitCount: number
    residentCount: number
    duesCount: number
    paymentCount: number
  }
  quickRoles?: UserRole[]
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [devTenantId, setDevTenantIdState] = useState('')
  const [devRole, setDevRole] = useState<UserRole.TENANT_ADMIN | UserRole.STAFF>(UserRole.STAFF)
  const [devError, setDevError] = useState<string | null>(null)
  const [bootstrap, setBootstrap] = useState<DevBootstrapResponse | null>(null)
  const [bootstrapLoading, setBootstrapLoading] = useState(false)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)

  const isDevBypassEnabled = process.env['NEXT_PUBLIC_USE_DEV_BYPASS'] === 'true' || process.env['NODE_ENV'] !== 'production'

  useEffect(() => {
    const savedTenantId = getDevTenantId()
    if (savedTenantId) {
      setDevTenantIdState(savedTenantId)
    }

    if (!isDevBypassEnabled) return

    let active = true
    const loadBootstrap = async () => {
      setBootstrapLoading(true)
      setBootstrapError(null)
      try {
        const response = await fetch(`${BASE_URL}/auth/dev-bootstrap`)
        const payload = await response.json().catch(() => null) as { data?: DevBootstrapResponse } | null

        if (!active) return
        if (!response.ok || !payload?.data) {
          throw new Error('Dev bootstrap bilgisi alınamadı')
        }

        setBootstrap(payload.data)

        if (!savedTenantId && payload.data.ready && payload.data.tenantId) {
          setDevTenantIdState(payload.data.tenantId)
          setDevTenantId(payload.data.tenantId)
        }
      } catch (err) {
        if (!active) return
        setBootstrapError(err instanceof Error ? err.message : 'Dev bootstrap bilgisi alınamadı')
      } finally {
        if (active) setBootstrapLoading(false)
      }
    }

    void loadBootstrap()

    return () => {
      active = false
    }
  }, [isDevBypassEnabled])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!auth) {
      setError('Firebase ayari eksik. Dev Hizli Giris kullanin.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      window.location.href = '/dashboard'
    } catch {
      setError('E-posta veya şifre hatalı')
    } finally {
      setLoading(false)
    }
  }

  function handleDevLogin(e: React.FormEvent) {
    e.preventDefault()
    setDevError(null)

    const tenantId = devTenantId.trim()

    if (!tenantId) {
      setDevError('Tenant ID zorunlu')
      return
    }

    setDevTenantId(tenantId)

    setSessionCookie({
      userId: `dev-${devRole.toLowerCase()}`,
      tenantId,
      role: devRole,
    })

    window.location.href = '/dashboard'
  }

  return (
    <div className="relative min-h-screen overflow-hidden ledger-mesh-bg px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-10 h-72 w-72 rounded-full bg-[#4f7df7]/12 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-[#3bd1ff]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#17345a]/6 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-md">
        <div className="ledger-panel space-y-8 p-8">
          <div className="flex justify-center">
            <BrandLockup subtitle="Yönetim Paneli" compact />
          </div>

          <div className="text-center">
            <p className="ledger-label">Admin Access</p>
            <p className="mt-2 text-sm leading-6 text-[#64758b]">
              Wafra Software tarafından sunulan Sakin Yönetim yönetim yüzeyine giriş yapın.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-posta
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Şifre
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>

          {isDevBypassEnabled && (
            <form className="space-y-4 border-t border-[#dbe4ef] pt-6" onSubmit={handleDevLogin}>
              <div>
                <p className="ledger-label">Dev Hızlı Giriş</p>
                <p className="mt-2 text-xs leading-5 text-[#6b7280]">Demo tenant ve rol ile panele kısa yoldan erişim.</p>
              </div>

              <div className="rounded-[22px] border border-white/80 bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#71829a]">Demo Bootstrap</p>
                {bootstrapLoading && <p className="mt-2 text-xs text-gray-500">Demo verisi kontrol ediliyor...</p>}
                {bootstrapError && <p className="mt-2 text-xs text-red-600">{bootstrapError}</p>}
                {bootstrap && !bootstrap.ready && (
                  <p className="mt-2 text-xs text-red-600">{bootstrap.message ?? 'Demo verisi hazır değil.'}</p>
                )}
                {bootstrap?.ready && (
                  <>
                    <p className="mt-2 text-xs text-gray-700">
                      {bootstrap.tenantName} ({bootstrap.tenantSlug})
                    </p>
                    {bootstrap.stats && (
                      <p className="mt-1 text-[11px] leading-5 text-gray-600">
                        Site: {bootstrap.stats.siteCount} · Daire: {bootstrap.stats.unitCount} ·
                        Sakin: {bootstrap.stats.residentCount} · Aidat: {bootstrap.stats.duesCount} ·
                        Tahsilat: {bootstrap.stats.paymentCount}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDevRole(UserRole.STAFF)}
                  className={`rounded-2xl px-2 py-2 text-xs font-semibold border transition-all ${
                    devRole === UserRole.STAFF
                      ? 'bg-[#102038] text-white border-[#102038] shadow-[0_12px_24px_rgba(16,32,56,0.18)]'
                      : 'bg-white text-gray-700 border-[#d8e2ee]'
                  }`}
                >
                  Personel
                </button>
                <button
                  type="button"
                  onClick={() => setDevRole(UserRole.TENANT_ADMIN)}
                  className={`rounded-2xl px-2 py-2 text-xs font-semibold border transition-all ${
                    devRole === UserRole.TENANT_ADMIN
                      ? 'bg-[#102038] text-white border-[#102038] shadow-[0_12px_24px_rgba(16,32,56,0.18)]'
                      : 'bg-white text-gray-700 border-[#d8e2ee]'
                  }`}
                >
                  Yönetici
                </button>
              </div>

              <div className="space-y-2">
                <label htmlFor="devTenantId" className="block text-sm font-medium text-gray-700">
                  Tenant ID
                </label>
                <input
                  id="devTenantId"
                  value={devTenantId}
                  onChange={(e) => setDevTenantIdState(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="block w-full rounded-2xl border border-[#d8e2ee] bg-white px-3 py-2 text-sm"
                />
                {bootstrap?.ready && bootstrap.tenantId && (
                  <button
                    type="button"
                    onClick={() => {
                      setDevTenantIdState(bootstrap.tenantId!)
                      setDevTenantId(bootstrap.tenantId!)
                    }}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Demo tenant ID kullan
                  </button>
                )}
              </div>

              {devError && (
                <p className="text-sm text-red-600">{devError}</p>
              )}

              <Button type="submit" variant="secondary" className="w-full">
                Dev Hızlı Giriş
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
