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

export default function WorkPaymentsPage() {
  const { selectedSiteId, hydrated, error: siteError } = useSiteContext()
  const searchParams = useSearchParams()

  const [payments, setPayments] = useState<PaymentsResponse['data']>([])
  const [summary, setSummary] = useState<PaymentsResponse['summary'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [openModal, setOpenModal] = useState(false)

  const [statusFilter, setStatusFilter] = useState('ALL')
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'ONLINE_CARD' | 'CASH' | 'BANK_TRANSFER' | 'POS'>('ALL')
  const [search, setSearch] = useState('')
  const [duesIdFilter, setDuesIdFilter] = useState('')

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    const status = searchParams.get('status') ?? 'ALL'
    const method = searchParams.get('method') ?? 'ALL'
    const duesId = searchParams.get('duesId') ?? ''
    setSearch(q)
    setStatusFilter(status)
    if (method === 'ONLINE_CARD' || method === 'CASH' || method === 'BANK_TRANSFER' || method === 'POS') {
      setMethodFilter(method)
    } else {
      setMethodFilter('ALL')
    }
    setDuesIdFilter(duesId)
    if (duesId) setOpenModal(true)
  }, [searchParams])

  const loadPayments = async () => {
    if (!selectedSiteId) return
    try {
      const response = await apiClient<PaymentsResponse>('/payments', {
        params: workQuery({
          siteId: selectedSiteId,
          page: 1,
          limit: 200,
          duesId: duesIdFilter || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          method: methodFilter === 'ALL' ? undefined : methodFilter,
          search: search.trim() || undefined,
        }),
      })
      setPayments(response.data)
      setSummary(response.summary ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Odeme listesi alinamadi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hydrated || !selectedSiteId) return
    setLoading(true)
    void loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, hydrated, statusFilter, methodFilter, search, duesIdFilter])

  useEffect(() => {
    if (hydrated && !selectedSiteId) {
      setLoading(false)
    }
  }, [hydrated, selectedSiteId])

  async function handlePaymentSuccess() {
    setMessage('Tahsilat kaydi basariyla olusturuldu.')
    setError(null)
    await loadPayments()
  }

  const stats = useMemo(() => {
    const pending = summary?.statusTotals.find((s) => s.status === 'PENDING')?.count ?? 0
    const failed = summary?.statusTotals.find((s) => s.status === 'FAILED')?.count ?? 0
    const confirmed = summary?.statusTotals.find((s) => s.status === 'CONFIRMED')?.count ?? 0
    return {
      monthTotal: summary?.monthTotal ?? 0,
      pending,
      failed,
      confirmed,
    }
  }, [summary])

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Work Odemeler"
        subtitle="Tahsilat operasyonu icin ayrik odeme izleme ve hizli tahsilat alani."
        actions={(
          <button
            type="button"
            onClick={() => setOpenModal(true)}
            className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white"
          >
            Yeni Tahsilat
          </button>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StaffKpiCard label="Bu Ay Tahsilat" value={formatTry(stats.monthTotal)} />
        <StaffKpiCard label="Basarili Islem" value={stats.confirmed} />
        <StaffKpiCard label="Bekleyen Islem" value={stats.pending} />
        <StaffKpiCard label="Basarisiz Islem" value={stats.failed} />
      </div>

      <div className="ledger-panel-soft p-3 grid grid-cols-1 lg:grid-cols-5 gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Odeme ara..."
          className="ledger-input bg-white lg:col-span-2"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="ledger-input bg-white">
          <option value="ALL">Durum: Tumu</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="PENDING">PENDING</option>
          <option value="FAILED">FAILED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="REFUNDED">REFUNDED</option>
        </select>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value as 'ALL' | 'ONLINE_CARD' | 'CASH' | 'BANK_TRANSFER' | 'POS')}
          className="ledger-input bg-white"
        >
          <option value="ALL">Yontem: Tumu</option>
          <option value="ONLINE_CARD">ONLINE_CARD</option>
          <option value="BANK_TRANSFER">BANK_TRANSFER</option>
          <option value="CASH">CASH</option>
          <option value="POS">POS</option>
        </select>
        <input
          value={duesIdFilter}
          onChange={(e) => setDuesIdFilter(e.target.value)}
          placeholder="Dues ID (deep-link)"
          className="ledger-input bg-white"
        />
      </div>

      {loading && <p className="text-sm text-[#6b7280]">Yukleniyor...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && !selectedSiteId && (
        <div className="ledger-panel p-5">
          <p className="text-sm text-[#6b7280]">
            {siteError
              ? `Site verisi alınamadı: ${siteError}`
              : 'Aktif bina secimi bulunamadi. Ust bardan bir bina secin.'}
          </p>
        </div>
      )}

      {!loading && !error && selectedSiteId && (
        <div className="ledger-panel overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
            <span className="col-span-2">Islem Tarihi</span>
            <span className="col-span-2">Daire / Site</span>
            <span className="col-span-2">Odeyen</span>
            <span className="col-span-2 text-right">Tutar</span>
            <span className="col-span-2">Yontem</span>
            <span className="col-span-1">Durum</span>
            <span className="col-span-1 text-right">Makbuz</span>
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
            {payments.length === 0 && <p className="px-5 py-6 text-sm text-[#6b7280]">Odeme kaydi bulunamadi.</p>}
          </div>
        </div>
      )}

      {message && <p className="text-sm text-green-700">{message}</p>}

      <PaymentCollectModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSuccess={handlePaymentSuccess}
        initialDuesId={duesIdFilter || undefined}
      />
    </div>
  )
}
