'use client'

import { useEffect, useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900">Sakin</h1>
          <p className="mt-2 text-center text-sm text-gray-600">Yönetim Paneli</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
          <form className="pt-6 border-t border-gray-200 space-y-3" onSubmit={handleDevLogin}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dev Hızlı Giriş</p>

            <div className="rounded-md bg-gray-50 border border-gray-200 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">Demo Bootstrap</p>
              {bootstrapLoading && <p className="text-xs text-gray-500">Demo verisi kontrol ediliyor...</p>}
              {bootstrapError && <p className="text-xs text-red-600">{bootstrapError}</p>}
              {bootstrap && !bootstrap.ready && (
                <p className="text-xs text-red-600">{bootstrap.message ?? 'Demo verisi hazır değil.'}</p>
              )}
              {bootstrap?.ready && (
                <>
                  <p className="text-xs text-gray-700">
                    {bootstrap.tenantName} ({bootstrap.tenantSlug})
                  </p>
                  {bootstrap.stats && (
                    <p className="text-[11px] text-gray-600">
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
                className={`px-2 py-2 rounded-md text-xs font-semibold border ${
                  devRole === UserRole.STAFF ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Personel
              </button>
              <button
                type="button"
                onClick={() => setDevRole(UserRole.TENANT_ADMIN)}
                className={`px-2 py-2 rounded-md text-xs font-semibold border ${
                  devRole === UserRole.TENANT_ADMIN ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'
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
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
  )
}
