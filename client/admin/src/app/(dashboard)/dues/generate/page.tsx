'use client'

import { useState } from 'react'
import { useSiteContext } from '@/providers/site-provider'
import { apiClient } from '@/lib/api'
import { DuesType, type GenerateDuesDto } from '@sakin/shared'
import { PageHeader, SectionTitle } from '@/components/surface'
import { Button } from '@/components/ui/button'

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const currentYear = new Date().getFullYear()
const YEARS = [currentYear - 1, currentYear, currentYear + 1]

export default function GenerateDuesPage() {
  const { selectedSiteId, availableSites } = useSiteContext()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; total: number; period: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    const form = new FormData(e.currentTarget)
    const dto: GenerateDuesDto = {
      siteId: form.get('siteId') as string,
      periodMonth: parseInt(form.get('periodMonth') as string, 10),
      periodYear: parseInt(form.get('periodYear') as string, 10),
      amount: parseFloat(form.get('amount') as string),
      type: DuesType.AIDAT,
      currency: 'TRY',
      dueDayOfMonth: parseInt(form.get('dueDayOfMonth') as string, 10),
      description: (form.get('description') as string) || undefined,
    }

    try {
      const res = await apiClient<typeof result>('/dues/generate', {
        method: 'POST',
        body: JSON.stringify(dto),
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 motion-in">
      <PageHeader
        title="Toplu Aidat Oluştur"
        eyebrow="Aidat Operasyonu"
        subtitle="Seçili dönem için tüm dairelere aidat kaydı açılır. Aynı dönem için ikinci kez çalıştırılabilir — mevcut kayıtlar etkilenmez."
      />

      <form onSubmit={handleSubmit} className="ledger-panel overflow-hidden">
        <SectionTitle
          title="Dönem parametreleri"
          subtitle="Bu akış seçili site ve dönem için tek seferlik toplu borç kaydı üretir."
        />
        <div className="p-6 space-y-5 max-w-2xl">

        {/* Site Seçimi */}
        <div className="space-y-1.5">
          <label htmlFor="siteId" className="ledger-label">Site</label>
          <select
            id="siteId"
            name="siteId"
            required
            defaultValue={selectedSiteId ?? ''}
            className="ledger-input bg-white w-full"
          >
            <option value="" disabled>Site seçin...</option>
            {availableSites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>

        {/* Dönem Seçimi */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="periodMonth" className="ledger-label">Dönem Ayı</label>
            <select
              id="periodMonth"
              name="periodMonth"
              required
              defaultValue={new Date().getMonth() + 1}
              className="ledger-input bg-white w-full"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="periodYear" className="ledger-label">Yıl</label>
            <select
              id="periodYear"
              name="periodYear"
              required
              defaultValue={currentYear}
              className="ledger-input bg-white w-full"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tutar ve Vade */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="amount" className="ledger-label">Tutar (₺)</label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min={0}
              required
              placeholder="0.00"
              className="ledger-input bg-white w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="dueDayOfMonth" className="ledger-label">Son Ödeme Günü</label>
            <input
              id="dueDayOfMonth"
              name="dueDayOfMonth"
              type="number"
              min={1}
              max={28}
              defaultValue={10}
              required
              className="ledger-input bg-white w-full"
            />
          </div>
        </div>

        {/* Açıklama */}
        <div className="space-y-1.5">
          <label htmlFor="description" className="ledger-label">
            Açıklama <span className="normal-case font-normal text-[#9ca3af]">(opsiyonel)</span>
          </label>
          <input
            id="description"
            name="description"
            placeholder="Ör: Nisan 2025 aidat"
            className="ledger-input bg-white w-full"
          />
        </div>

        {/* Hata */}
        {error && (
          <div role="alert" className="rounded-[16px] px-4 py-2.5 bg-[#ffdad6] text-[#93000a] text-sm font-medium">
            {error}
          </div>
        )}

        {/* Başarı */}
        {result && (
          <div role="status" className="rounded-[16px] px-4 py-2.5 bg-[#d8f7dd] text-[#006e2d] text-sm font-medium">
            {result.period} dönemi için {result.created}/{result.total} aidat oluşturuldu.
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Oluşturuluyor...' : 'Aidatları Oluştur'}
        </Button>
        </div>
      </form>
    </div>
  )
}
