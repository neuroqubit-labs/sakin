'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api'
import { useSiteContext } from '@/providers/site-provider'
import { duesStatusLabel, duesStatusTone, formatShortDate, formatTry } from '@/lib/work-presenters'
import { workQuery } from '@/lib/work-query'
import { StaffPageHeader, StaffStatusPill } from '@/components/staff-surface'

interface DuesListResponse {
  data: Array<{
    id: string
    amount: string | number
    paidAmount: string | number
    status: string
    periodMonth: number
    periodYear: number
    dueDate: string
    description?: string | null
    unit: { number: string; floor: number | null; site: { name: string } }
  }>
}

export default function WorkDuesPage() {
  const { selectedSiteId, hydrated } = useSiteContext()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dues, setDues] = useState<DuesListResponse['data']>([])

  const today = new Date()
  const [periodMonth, setPeriodMonth] = useState(today.getMonth() + 1)
  const [periodYear, setPeriodYear] = useState(today.getFullYear())
  const [amount, setAmount] = useState(1250)
  const [dueDayOfMonth, setDueDayOfMonth] = useState(10)
  const [description, setDescription] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const loadDues = async () => {
    if (!selectedSiteId) return
    try {
      const response = await apiClient<DuesListResponse>('/dues', {
        params: workQuery({
          siteId: selectedSiteId,
          page: 1,
          limit: 200,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        }),
      })
      setDues(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aidatlar yüklenemedi')
    }
  }

  useEffect(() => {
    if (!hydrated || !selectedSiteId) return
    void loadDues()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, hydrated, statusFilter])

  const periodText = useMemo(() => `${periodMonth}/${periodYear}`, [periodMonth, periodYear])
  const previewTotal = useMemo(() => dues.reduce((sum, row) => sum + Math.max(0, Number(row.amount) - Number(row.paidAmount)), 0), [dues])
  const overdueCount = useMemo(() => dues.filter((row) => row.status === 'OVERDUE').length, [dues])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSiteId) return
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const result = await apiClient<{ created: number; total: number; period: string }>('/dues/generate', {
        method: 'POST',
        body: JSON.stringify({
          siteId: selectedSiteId,
          periodMonth,
          periodYear,
          amount,
          dueDayOfMonth,
          description: description || undefined,
        }),
      })
      setMessage(`${result.period} dönemi için ${result.created}/${result.total} aidat oluşturuldu.`)
      await loadDues()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tahakkuk oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Aidat ve Tahakkuk Yönetimi"
        subtitle="Toplu borç üretin, dönem bazlı tahakkuk ve ödeme durumunu izleyin."
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div className="xl:col-span-4 space-y-3">
          <form onSubmit={handleGenerate} className="ledger-panel overflow-hidden">
            <div className="px-5 py-4 ledger-gradient text-white">
              <h2 className="text-sm font-bold tracking-[0.12em] uppercase">Yeni Borç Üret</h2>
              <p className="text-xs mt-1 opacity-80">Seçili binadaki aktif dairelere uygulanır.</p>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="ledger-label">Tutar (₺)</label>
                <input
                  type="number"
                  min={1}
                  step={0.01}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="ledger-input w-full mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="ledger-label">Ay</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={periodMonth}
                    onChange={(e) => setPeriodMonth(Number(e.target.value))}
                    className="ledger-input w-full mt-2"
                  />
                </div>
                <div>
                  <label className="ledger-label">Yıl</label>
                  <input
                    type="number"
                    min={2024}
                    value={periodYear}
                    onChange={(e) => setPeriodYear(Number(e.target.value))}
                    className="ledger-input w-full mt-2"
                  />
                </div>
              </div>

              <div>
                <label className="ledger-label">Vade Günü</label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={dueDayOfMonth}
                  onChange={(e) => setDueDayOfMonth(Number(e.target.value))}
                  className="ledger-input w-full mt-2"
                />
              </div>

              <div>
                <label className="ledger-label">Açıklama</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="ledger-input w-full mt-2"
                  placeholder={`Örn: ${periodText} Genel Aidat`}
                />
              </div>

              <button type="submit" disabled={loading || !selectedSiteId} className="w-full px-4 py-3 rounded-md ledger-gradient text-white text-sm font-bold">
                {loading ? 'Oluşturuluyor...' : 'Tüm Dairelere Uygula'}
              </button>
              <p className="text-[11px] text-[#6b7280]">
                Bu işlem seçili dönemde tekrar edilirse yalnızca eksik kayıtlar oluşturulur.
              </p>
            </div>
          </form>

          <div className="ledger-panel-soft p-4">
            <p className="text-xs font-bold tracking-[0.16em] uppercase text-[#4f5d6c]">Güncel Durum</p>
            <p className="text-lg font-bold text-[#0c1427] mt-2">{formatTry(previewTotal)} açık bakiye</p>
            <p className="text-xs text-[#6b7280] mt-1">{overdueCount} gecikmiş kayıt</p>
          </div>
        </div>

        <div className="xl:col-span-8 ledger-panel overflow-hidden">
          <div className="px-5 py-4 bg-[#f2f4f6] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Tahakkuk Listesi</h2>
              <p className="text-xs text-[#6b7280] mt-1">{periodText} ve seçili filtreler</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ledger-input bg-white text-xs">
                <option value="ALL">Tümü</option>
                <option value="PENDING">Bekleyen</option>
                <option value="PARTIALLY_PAID">Kısmi</option>
                <option value="OVERDUE">Gecikmiş</option>
                <option value="PAID">Ödendi</option>
              </select>
              <button type="button" className="px-3 py-1.5 rounded-md bg-white text-xs font-semibold text-[#0c1427]">Dışa Aktar</button>
            </div>
          </div>

          <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
            <span className="col-span-2">Daire</span>
            <span className="col-span-2">Dönem</span>
            <span className="col-span-2 text-right">Tutar</span>
            <span className="col-span-2 text-right">Ödenen</span>
            <span className="col-span-2">Durum</span>
            <span className="col-span-1">Vade</span>
            <span className="col-span-1 text-right">Aksiyon</span>
          </div>

          <div className="ledger-divider">
            {dues.map((item) => (
              <div key={item.id} className="grid grid-cols-12 px-5 py-3 items-center text-sm ledger-table-row-hover">
                <div className="col-span-2">
                  <p className="font-semibold text-[#0c1427]">{item.unit.number}</p>
                  <p className="text-[11px] text-[#6b7280]">{item.unit.site.name}</p>
                </div>
                <span className="col-span-2 tabular-nums">{item.periodMonth}/{item.periodYear}</span>
                <span className="col-span-2 text-right tabular-nums">{formatTry(Number(item.amount))}</span>
                <span className="col-span-2 text-right tabular-nums">{formatTry(Number(item.paidAmount))}</span>
                <span className="col-span-2">
                  <StaffStatusPill label={duesStatusLabel(item.status)} tone={duesStatusTone(item.status)} />
                </span>
                <span className="col-span-1 text-xs">{formatShortDate(item.dueDate)}</span>
                <div className="col-span-1 text-right">
                  <button type="button" className="text-xs font-bold text-[#0c1427]">...</button>
                </div>
              </div>
            ))}
            {dues.length === 0 && <p className="px-5 py-6 text-sm text-[#6b7280]">Seçili bina için aidat kaydı bulunamadı.</p>}
          </div>
        </div>
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
