'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useSiteContext } from '@/providers/site-provider'
import {
  formatDateTime,
  formatTry,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
} from '@/lib/work-presenters'
import { workQuery } from '@/lib/work-query'
import { StaffKpiCard, StaffPageHeader, StaffStatusPill } from '@/components/staff-surface'
import { PaymentCollectModal } from '@/components/payment-collect-modal'

interface PaymentsResponse {
  data: Array<{
    id: string
    amount: string | number
    method: 'ONLINE_CARD' | 'CASH' | 'BANK_TRANSFER' | 'POS'
    status: string
    paidAt: string | null
    duesId: string | null
    note?: string | null
    unit: { number: string; site: { name: string } }
    paidByResident: { firstName: string; lastName: string } | null
  }>
  summary?: {
    monthTotal: number
    methodTotals: {
      onlineCard: number
      cash: number
      bankTransfer: number
      pos: number
    }
    statusTotals: Array<{
      status: string
      count: number
      amount: number
    }>
  }
}

export default function WorkCollectionsPage() {
  const { selectedSiteId, hydrated, error: siteError } = useSiteContext()
  const searchParams = useSearchParams()
  const presetDuesId = searchParams.get('duesId') ?? ''

  const [payments, setPayments] = useState<PaymentsResponse['data']>([])
  const [summary, setSummary] = useState<PaymentsResponse['summary'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [openModal, setOpenModal] = useState(false)

  const [statusFilter, setStatusFilter] = useState('ALL')
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'ONLINE_CARD' | 'CASH' | 'BANK_TRANSFER' | 'POS'>('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (presetDuesId) setOpenModal(true)
  }, [presetDuesId])

  const loadPayments = async () => {
    if (!selectedSiteId) return
    try {
      const response = await apiClient<PaymentsResponse>('/payments', {
        params: workQuery({
          siteId: selectedSiteId,
          page: 1,
          limit: 150,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          method: methodFilter === 'ALL' ? undefined : methodFilter,
          search: search.trim() || undefined,
        }),
      })
      setPayments(response.data)
      setSummary(response.summary ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tahsilat listesi alınamadı')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hydrated || !selectedSiteId) return
    setLoading(true)
    void loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, hydrated, statusFilter, methodFilter, search])

  useEffect(() => {
    if (hydrated && !selectedSiteId) {
      setLoading(false)
    }
  }, [hydrated, selectedSiteId])

  async function handlePaymentSuccess() {
    setMessage('Tahsilat kaydı başarıyla oluşturuldu.')
    setError(null)
    await loadPayments()
  }

  const chart = useMemo(() => {
    const methodTotals = summary?.methodTotals ?? { onlineCard: 0, cash: 0, bankTransfer: 0, pos: 0 }
    const total = methodTotals.onlineCard + methodTotals.cash + methodTotals.bankTransfer + methodTotals.pos
    if (total <= 0) return { total, online: 0, bank: 0, cash: 0 }
    return {
      total,
      online: Math.round((methodTotals.onlineCard / total) * 100),
      bank: Math.round((methodTotals.bankTransfer / total) * 100),
      cash: Math.max(0, 100 - Math.round((methodTotals.onlineCard / total) * 100) - Math.round((methodTotals.bankTransfer / total) * 100)),
    }
  }, [summary])

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Tahsilat Yönetimi"
        subtitle="Manuel tahsilat, yöntem dağılımı ve ödeme hareketlerini operasyon odaklı izleyin."
        actions={(
          <>
            <button type="button" className="px-3 py-2 rounded-md bg-[#e6e8ea] text-xs font-semibold text-[#0c1427]">
              Dışa Aktar
            </button>
            <button type="button" onClick={() => setOpenModal(true)} className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white">
              Yeni Tahsilat
            </button>
          </>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StaffKpiCard label="Toplam Tahsilat (Bu Ay)" value={formatTry(summary?.monthTotal ?? 0)} />
        <StaffKpiCard label="Nakit" value={<span className="text-[#006e2d]">{formatTry(summary?.methodTotals.cash ?? 0)}</span>} />
        <StaffKpiCard label="Banka Transferi" value={<span className="text-[#0c1427]">{formatTry(summary?.methodTotals.bankTransfer ?? 0)}</span>} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div className="xl:col-span-8 ledger-panel overflow-hidden">
          <div className="px-5 py-4 bg-[#f2f4f6] flex flex-wrap gap-2 items-center justify-between">
            <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Son Tahsilatlar</h2>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tahsilat ara..."
                className="ledger-input bg-white text-xs"
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ledger-input bg-white text-xs">
                <option value="ALL">Durum: Tümü</option>
                <option value="CONFIRMED">Başarılı</option>
                <option value="PENDING">Bekleyen</option>
                <option value="FAILED">Başarısız</option>
              </select>
              <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value as 'ALL' | 'ONLINE_CARD' | 'CASH' | 'BANK_TRANSFER' | 'POS')} className="ledger-input bg-white text-xs">
                <option value="ALL">Yöntem: Tümü</option>
                <option value="ONLINE_CARD">Online</option>
                <option value="BANK_TRANSFER">EFT/Havale</option>
                <option value="CASH">Nakit</option>
                <option value="POS">POS</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
            <span className="col-span-2">İşlem Tarihi</span>
            <span className="col-span-2">Daire / Site</span>
            <span className="col-span-2">Ödeyen</span>
            <span className="col-span-2 text-right">Tutar</span>
            <span className="col-span-2">Yöntem</span>
            <span className="col-span-1">Durum</span>
            <span className="col-span-1 text-right">Aksiyon</span>
          </div>
          <div className="ledger-divider">
            {payments.map((payment) => (
              <div key={payment.id} className="grid grid-cols-12 px-5 py-3 items-center text-sm ledger-table-row-hover">
                <span className="col-span-2 text-xs">{formatDateTime(payment.paidAt)}</span>
                <div className="col-span-2">
                  <p className="font-semibold text-[#0c1427]">{payment.unit.number}</p>
                  <p className="text-[11px] text-[#6b7280]">{payment.unit.site.name}</p>
                </div>
                <span className="col-span-2">{payment.paidByResident ? `${payment.paidByResident.firstName} ${payment.paidByResident.lastName}` : '-'}</span>
                <span className="col-span-2 text-right tabular-nums font-semibold">{formatTry(Number(payment.amount))}</span>
                <span className="col-span-2">{paymentMethodLabel(payment.method)}</span>
                <span className="col-span-1">
                  <StaffStatusPill label={paymentStatusLabel(payment.status)} tone={paymentStatusTone(payment.status)} />
                </span>
                <div className="col-span-1 text-right">
                  <button type="button" className="text-xs font-bold text-[#0c1427]">Makbuz</button>
                </div>
              </div>
            ))}
            {payments.length === 0 && <p className="px-5 py-6 text-sm text-[#6b7280]">Tahsilat kaydı bulunamadı.</p>}
          </div>
        </div>

        <div className="xl:col-span-4 space-y-3">
          <div className="ledger-panel p-5">
            <p className="text-xs font-bold tracking-[0.16em] uppercase text-[#4f5d6c]">Ödeme Yöntemi Dağılımı</p>
            <div className="mt-4 flex items-center gap-4">
              <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="#e0e3e5" strokeWidth="4" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#0c1427" strokeWidth="4" strokeDasharray={`${chart.online}, 100`} />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#006e2d" strokeWidth="4" strokeDasharray={`${chart.bank}, 100`} strokeDashoffset={`-${chart.online}`} />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#9ba3ad" strokeWidth="4" strokeDasharray={`${chart.cash}, 100`} strokeDashoffset={`-${chart.online + chart.bank}`} />
              </svg>
              <div className="space-y-2 text-xs">
                <p className="flex items-center justify-between gap-3"><span>Online</span><strong className="tabular-nums">%{chart.online}</strong></p>
                <p className="flex items-center justify-between gap-3"><span>EFT/Havale</span><strong className="tabular-nums">%{chart.bank}</strong></p>
                <p className="flex items-center justify-between gap-3"><span>Nakit</span><strong className="tabular-nums">%{chart.cash}</strong></p>
              </div>
            </div>
          </div>

          <div className="ledger-gradient rounded-xl p-5 text-white">
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold opacity-70">Geciken Ödemeler</p>
            <p className="text-2xl font-black tabular-nums mt-2">
              {summary?.statusTotals.find((item) => item.status === 'PENDING')?.count ?? 0}
            </p>
            <p className="text-xs opacity-80 mt-1">Bekleyen işlem adedi</p>
            <button type="button" className="mt-3 w-full py-2 rounded-md bg-white/10 text-xs font-bold">
              Hatırlatıcı Gönder
            </button>
          </div>

          <div className="ledger-panel-soft p-4">
            <p className="text-xs font-bold tracking-[0.14em] uppercase text-[#4f5d6c]">Yardımcı Not</p>
            <p className="text-sm text-[#0c1427] mt-2">
              Banka transferlerinde ödeme notunu zorunlu tutmanız mutabakat hızını artırır.
            </p>
          </div>
        </div>
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-[#6b7280]">Yükleniyor...</p>}
      {!loading && !error && !selectedSiteId && (
        <div className="ledger-panel p-5">
          <p className="text-sm text-[#6b7280]">
            {siteError
              ? `Site verisi alınamadı: ${siteError}`
              : 'Aktif bina seçimi bulunamadı. Tahsilat ekranı için önce bir bina seçin.'}
          </p>
        </div>
      )}

      <PaymentCollectModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSuccess={handlePaymentSuccess}
        initialDuesId={presetDuesId || undefined}
      />
    </div>
  )
}
