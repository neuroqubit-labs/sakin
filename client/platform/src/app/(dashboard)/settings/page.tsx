'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

type SmsProvider = 'NETGSM' | 'ILETIMERKEZI' | 'TWILIO' | 'MOCK'
type Language = 'tr' | 'en'
type PlanType = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

interface Settings {
  systemName?: string
  logoUrl?: string | null
  supportEmail?: string
  supportPhone?: string
  defaultLanguage?: Language
  defaultTimezone?: string
  smsProvider?: SmsProvider
  smsSenderName?: string
  defaultPlan?: PlanType
  defaultTrialDays?: number
  maintenanceMode?: boolean
  maintenanceMessage?: string
}

const TIMEZONES = [
  'Europe/Istanbul',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'UTC',
]

export default function SettingsPage() {
  const [form, setForm] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiClient<Settings>('/platform/settings')
        setForm(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ayarlar alınamadı')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      const payload: Settings = { ...form }
      if (payload.logoUrl === '') payload.logoUrl = null
      const updated = await apiClient<Settings>('/platform/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      setForm(updated)
      setSuccess('Ayarlar kaydedildi')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sistem Ayarları</h1>
        <p className="text-sm text-gray-500 mt-1">
          Platform geneli ayarlar. Tüm tenant&apos;ları etkiler.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-md">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-md">{success}</div>}

      <form onSubmit={handleSave} className="space-y-6">
        <Section title="Marka" description="Sistem kimliği ve iletişim bilgileri.">
          <Field label="Sistem adı">
            <input
              type="text"
              value={form.systemName ?? ''}
              onChange={(e) => set('systemName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </Field>
          <Field label="Logo URL">
            <input
              type="url"
              value={form.logoUrl ?? ''}
              onChange={(e) => set('logoUrl', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </Field>
          <Field label="Destek e-posta">
            <input
              type="email"
              value={form.supportEmail ?? ''}
              onChange={(e) => set('supportEmail', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </Field>
          <Field label="Destek telefonu">
            <input
              type="tel"
              value={form.supportPhone ?? ''}
              onChange={(e) => set('supportPhone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </Field>
        </Section>

        <Section title="Yerelleştirme" description="Varsayılan dil ve saat dilimi.">
          <Field label="Dil">
            <select
              value={form.defaultLanguage ?? 'tr'}
              onChange={(e) => set('defaultLanguage', e.target.value as Language)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Saat dilimi">
            <select
              value={form.defaultTimezone ?? 'Europe/Istanbul'}
              onChange={(e) => set('defaultTimezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="SMS" description="Toplu bildirim sağlayıcı yapılandırması.">
          <Field label="Sağlayıcı">
            <select
              value={form.smsProvider ?? 'MOCK'}
              onChange={(e) => set('smsProvider', e.target.value as SmsProvider)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="MOCK">Mock (test)</option>
              <option value="NETGSM">NetGSM</option>
              <option value="ILETIMERKEZI">İleti Merkezi</option>
              <option value="TWILIO">Twilio</option>
            </select>
          </Field>
          <Field label="Gönderici adı">
            <input
              type="text"
              maxLength={20}
              value={form.smsSenderName ?? ''}
              onChange={(e) => set('smsSenderName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm uppercase"
            />
          </Field>
        </Section>

        <Section title="Onboarding Varsayılanları" description="Yeni kaydolan şirketler için.">
          <Field label="Varsayılan plan">
            <select
              value={form.defaultPlan ?? 'TRIAL'}
              onChange={(e) => set('defaultPlan', e.target.value as PlanType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="TRIAL">Deneme</option>
              <option value="STARTER">Başlangıç</option>
              <option value="PROFESSIONAL">Profesyonel</option>
              <option value="ENTERPRISE">Kurumsal</option>
            </select>
          </Field>
          <Field label="Deneme süresi (gün)">
            <input
              type="number"
              min={1}
              max={365}
              value={form.defaultTrialDays ?? 30}
              onChange={(e) => set('defaultTrialDays', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </Field>
        </Section>

        <Section title="Bakım Modu" description="Açıldığında tüm tenant girişleri askıya alınır.">
          <Field label="Bakım modu">
            <div className="flex items-center gap-2">
              <input
                id="maintenanceMode"
                type="checkbox"
                checked={form.maintenanceMode ?? false}
                onChange={(e) => set('maintenanceMode', e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="maintenanceMode" className="text-sm text-gray-700">
                {form.maintenanceMode ? 'Aktif' : 'Kapalı'}
              </label>
            </div>
          </Field>
          <Field label="Bakım mesajı" full>
            <textarea
              rows={3}
              maxLength={500}
              value={form.maintenanceMessage ?? ''}
              onChange={(e) => set('maintenanceMessage', e.target.value)}
              placeholder="Kullanıcılara gösterilecek mesaj"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </Field>
        </Section>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-40"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

function Field({
  label,
  children,
  full,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="text-xs font-medium text-gray-700 block mb-1">{label}</label>
      {children}
    </div>
  )
}
