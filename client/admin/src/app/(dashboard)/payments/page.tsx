'use client'

import { useEffect, useMemo, useState } from 'react'
import { StaffPageHeader, StaffStatusPill } from '@/components/staff-surface'
import { apiClient } from '@/lib/api'
import {
  formatShortDate,
  formatTry,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
} from '@/lib/work-presenters'
import { useAuth } from '@/providers/auth-provider'
import { useSiteContext } from '@/providers/site-provider'
import { PaymentMethod, PaymentStatus, UserRole } from '@sakin/shared'

interface PaymentRow {
  id: string
  amount: string | number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  provider: string
  paidAt: string | null
  receiptNumber: string | null
  note: string | null
  createdAt: string
  unit: { number: string; site: { name: string } }
}

interface PaymentsListResponse {
  data: PaymentRow[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  summary: {
    monthTotal: number
    methodTotals: {
      onlineCard: number
      bankTransfer: number
      cash: number
      pos: number
    }
    statusTotals: Array<{ status: PaymentStatus; amount: number; count: number }>
  }
}

interface ReconciliationResponse {
  totals: {
    confirmedAmount: number
    pendingAmount: number
    failedAmount: number
    pendingBankTransferCount: number
  }
}

interface SuspiciousRow extends PaymentRow {
  reasons: string[]
}

interface SuspiciousResponse {
  data: SuspiciousRow[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

function suspiciousReasonLabel(code: string) {
  if (code === 'PENDING_STALE') return 'Bekleyen-Islenmemis'
  if (code === 'MISSING_RECEIPT') return 'Makbuz Eksik'
  if (code === 'HIGH_AMOUNT_FAILED') return 'Yuksek Tutar Basarisiz'
  return code
}

export default function PaymentsPage() {
  const { role } = useAuth()
  const { selectedSiteId, hydrated } = useSiteContext()
  const isTenantAdmin = role === UserRole.TENANT_ADMIN

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL')

  const [payments, setPayments] = useState<PaymentsListResponse | null>(null)
  const [reconciliation, setReconciliation] = useState<ReconciliationResponse | null>(null)
  const [suspicious, setSuspicious] = useState<SuspiciousResponse | null>(null)

  const suspiciousCount = useMemo(() => suspicious?.meta.total ?? 0, [suspicious])

  const loadPayments = async () => {
    if (!hydrated || !selectedSiteId || !isTenantAdmin) return
    setLoading(true)
    setError(null)
    try {
      const [listRes, recRes, suspiciousRes] = await Promise.all([
        apiClient<PaymentsListResponse>('/payments', {
          params: {
            siteId: selectedSiteId,
            page: 1,
            limit: 50,
            search: search.trim() || undefined,
            method: methodFilter === 'ALL' ? undefined : methodFilter,
            status: statusFilter === 'ALL' ? undefined : statusFilter,
          },
        }),
        apiClient<ReconciliationResponse>('/payments/reconciliation-summary', {
          params: { siteId: selectedSiteId },
        }),
        apiClient<SuspiciousResponse>('/payments/suspicious', {
          params: { siteId: selectedSiteId, page: 1, limit: 20 },
        }),
      ])

      setPayments(listRes)
      setReconciliation(recRes)
      setSuspicious(suspiciousRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Odeme verileri yuklenemedi')
      setPayments(null)
      setReconciliation(null)
      setSuspicious(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hydrated || !selectedSiteId || !isTenantAdmin) return
    void loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, selectedSiteId, isTenantAdmin, methodFilter, statusFilter])

  const runSearch = async () => {
    await loadPayments()
  }

  const downloadCsv = async (kind: 'receipt' | 'audit') => {
    if (!selectedSiteId || !isTenantAdmin) return
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const endpoint = kind === 'receipt' ? '/payments/exports/receipt' : '/payments/exports/audit'
      const payload = await apiClient<{ fileName: string; csv: string; rowCount: number }>(endpoint, {
        params: {
          siteId: selectedSiteId,
          method: methodFilter === 'ALL' ? undefined : methodFilter,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          search: search.trim() || undefined,
        },
      })
      const blob = new Blob([payload.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = payload.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setMessage(`${payload.rowCount} satir ${kind === 'receipt' ? 'receipt' : 'audit'} export indirildi.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV export basarisiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Ödemeler"
        subtitle="Tahsilat audit, reconciliation ve supheli islem takibi."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void downloadCsv('receipt')}
              className="px-3 py-2 rounded-md bg-[#e6e8ea] text-xs font-semibold text-[#0c1427]"
            >
              Receipt Export
            </button>
            <button
              type="button"
              onClick={() => void downloadCsv('audit')}
              className="px-3 py-2 rounded-md bg-[#e6e8ea] text-xs font-semibold text-[#0c1427]"
            >
              Audit Export
            </button>
            <button
              type="button"
              onClick={() => void loadPayments()}
              className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white"
            >
              Yenile
            </button>
          </div>
        }
      />

      {!selectedSiteId && hydrated && <p className="text-sm text-[#6b7280]">Odeme raporu icin once site secin.</p>}

      {!isTenantAdmin && (
        <div className="ledger-panel p-6">
          <p className="text-sm text-[#6b7280]">Bu ekran tenant-admin audit/reconciliation alani icindir. STAFF operasyonu Action Center altinda devam eder.</p>
        </div>
      )}

      {isTenantAdmin && selectedSiteId && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div className="ledger-panel p-4">
              <p className="ledger-label">Onayli Tahsilat</p>
              <p className="ledger-value mt-2">{formatTry(reconciliation?.totals.confirmedAmount ?? 0)}</p>
            </div>
            <div className="ledger-panel p-4">
              <p className="ledger-label">Bekleyen Tutar</p>
              <p className="ledger-value mt-2">{formatTry(reconciliation?.totals.pendingAmount ?? 0)}</p>
            </div>
            <div className="ledger-panel p-4">
              <p className="ledger-label">Basarisiz Tutar</p>
              <p className="ledger-value mt-2">{formatTry(reconciliation?.totals.failedAmount ?? 0)}</p>
            </div>
            <div className="ledger-panel p-4">
              <p className="ledger-label">Supheli Kuyruk</p>
              <p className="ledger-value mt-2">{suspiciousCount}</p>
            </div>
          </div>

          <div className="ledger-panel p-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ledger-input bg-white lg:col-span-2"
                placeholder="Makbuz, not, daire no ara..."
              />
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value as typeof methodFilter)}
                className="ledger-input bg-white"
              >
                <option value="ALL">Tum Yontemler</option>
                <option value={PaymentMethod.ONLINE_CARD}>ONLINE_CARD</option>
                <option value={PaymentMethod.BANK_TRANSFER}>BANK_TRANSFER</option>
                <option value={PaymentMethod.CASH}>CASH</option>
                <option value={PaymentMethod.POS}>POS</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="ledger-input bg-white"
              >
                <option value="ALL">Tum Durumlar</option>
                <option value={PaymentStatus.PENDING}>PENDING</option>
                <option value={PaymentStatus.CONFIRMED}>CONFIRMED</option>
                <option value={PaymentStatus.FAILED}>FAILED</option>
                <option value={PaymentStatus.CANCELLED}>CANCELLED</option>
                <option value={PaymentStatus.REFUNDED}>REFUNDED</option>
              </select>
              <button
                type="button"
                onClick={() => void runSearch()}
                className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white"
              >
                Filtrele
              </button>
            </div>
          </div>

          <div className="ledger-panel overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
              <span className="col-span-2">Daire</span>
              <span className="col-span-2 text-right">Tutar</span>
              <span className="col-span-2">Yontem</span>
              <span className="col-span-2">Durum</span>
              <span className="col-span-2">Makbuz</span>
              <span className="col-span-2">Tarih</span>
            </div>
            <div className="ledger-divider">
              {payments?.data.map((row) => (
                <div key={row.id} className="grid grid-cols-12 px-5 py-3 items-center text-sm ledger-table-row-hover">
                  <div className="col-span-2">
                    <p className="font-semibold text-[#0c1427]">{row.unit.number}</p>
                    <p className="text-[11px] text-[#6b7280]">{row.unit.site.name}</p>
                  </div>
                  <p className="col-span-2 text-right tabular-nums">{formatTry(Number(row.amount))}</p>
                  <p className="col-span-2">{paymentMethodLabel(row.method)}</p>
                  <span className="col-span-2">
                    <StaffStatusPill label={paymentStatusLabel(row.status)} tone={paymentStatusTone(row.status)} />
                  </span>
                  <p className="col-span-2 text-xs text-[#445266]">{row.receiptNumber ?? '-'}</p>
                  <p className="col-span-2 text-xs text-[#445266]">{formatShortDate(row.paidAt ?? row.createdAt)}</p>
                </div>
              ))}
              {!loading && !payments?.data.length && (
                <p className="px-5 py-5 text-sm text-[#6b7280]">Filtreye uygun odeme bulunamadi.</p>
              )}
            </div>
          </div>

          <div className="ledger-panel overflow-hidden">
            <div className="px-5 py-4 bg-[#f2f4f6]">
              <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Suspicious Queue</h2>
              <p className="text-xs text-[#6b7280] mt-1">Inceleme gerektiren odemeler</p>
            </div>
            <div className="ledger-divider">
              {suspicious?.data.map((row) => (
                <div key={row.id} className="px-5 py-3 border-b border-[#e6e8ea] text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[#0c1427]">
                      {row.unit.site.name} / {row.unit.number} • {formatTry(Number(row.amount))}
                    </p>
                    <StaffStatusPill label={paymentStatusLabel(row.status)} tone={paymentStatusTone(row.status)} />
                  </div>
                  <p className="text-xs text-[#6b7280] mt-1">
                    {row.reasons.map(suspiciousReasonLabel).join(' | ')} • {paymentMethodLabel(row.method)} • {formatShortDate(row.createdAt)}
                  </p>
                </div>
              ))}
              {!loading && !suspicious?.data.length && (
                <p className="px-5 py-5 text-sm text-[#6b7280]">Supheli odeme kaydi yok.</p>
              )}
            </div>
          </div>
        </>
      )}

      {loading && <p className="text-xs text-[#6b7280]">Islem suruyor...</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
