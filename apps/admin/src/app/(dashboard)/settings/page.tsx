'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { GatewayMode, PaymentProvider } from '@sakin/shared'
import { StaffPageHeader } from '@/components/staff-surface'

interface GatewayConfigResponse {
  id: string
  provider: PaymentProvider
  mode: GatewayMode
  apiKey: string
  secretKeyMasked: string
  merchantName: string | null
  isActive: boolean
  updatedAt: string
}

const MODE_LABELS: Record<GatewayMode, string> = {
  [GatewayMode.TEST]: 'Test (Sandbox)',
  [GatewayMode.LIVE]: 'Canlı (Production)',
}

export default function SettingsPage() {
  const [config, setConfig] = useState<GatewayConfigResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form fields
  const [apiKey, setApiKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [mode, setMode] = useState<GatewayMode>(GatewayMode.TEST)
  const [merchantName, setMerchantName] = useState('')

  useEffect(() => {
    void loadConfig()
  }, [])

  async function loadConfig() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient<GatewayConfigResponse | null>('/tenant/payment-gateway')
      if (data) {
        setConfig(data)
        setApiKey(data.apiKey)
        setMode(data.mode)
        setMerchantName(data.merchantName ?? '')
        // secretKey is masked — leave blank so user must re-enter to update
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Konfigürasyon yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!apiKey.trim()) {
      setError('API Key zorunludur')
      return
    }
    if (!secretKey.trim()) {
      setError('Secret Key zorunludur')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await apiClient('/tenant/payment-gateway', {
        method: 'PUT',
        body: JSON.stringify({
          provider: PaymentProvider.IYZICO,
          mode,
          apiKey: apiKey.trim(),
          secretKey: secretKey.trim(),
          merchantName: merchantName.trim() || undefined,
          isActive: true,
        }),
      })
      setSuccess(true)
      setSecretKey('')
      void loadConfig()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Ayarlar"
        subtitle="iyzico ödeme gateway konfigürasyonu."
      />

      {/* Payment Gateway Config */}
      <div className="ledger-panel p-5 space-y-4 max-w-xl">
        <div>
          <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">iyzico Ödeme Gateway</h2>
          {config && (
            <p className="text-xs text-[#6b7280] mt-1">
              Mevcut: {MODE_LABELS[config.mode]} · API Key: {config.apiKey.slice(0, 8)}... · Son güncelleme: {new Date(config.updatedAt).toLocaleDateString('tr-TR')}
            </p>
          )}
        </div>

        {loading && <p className="text-sm text-[#6b7280]">Yükleniyor...</p>}

        {!loading && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="ledger-label">Ortam</label>
              <select
                className="ledger-input w-full"
                value={mode}
                onChange={(e) => setMode(e.target.value as GatewayMode)}
              >
                {Object.values(GatewayMode).map((m) => (
                  <option key={m} value={m}>{MODE_LABELS[m]}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="ledger-label">API Key</label>
              <input
                type="text"
                className="ledger-input w-full font-mono text-xs"
                placeholder="sandbox-xxxxxxxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="ledger-label">Secret Key {config && <span className="font-normal text-[#6b7280]">(mevcut: {config.secretKeyMasked})</span>}</label>
              <input
                type="password"
                className="ledger-input w-full font-mono text-xs"
                placeholder="Değiştirmek için girin"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="ledger-label">Merchant Adı (opsiyonel)</label>
              <input
                type="text"
                className="ledger-input w-full"
                placeholder="Demo Yönetim A.Ş."
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">Konfigürasyon kaydedildi.</p>}

            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-4 py-2 rounded-md ledger-gradient text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
