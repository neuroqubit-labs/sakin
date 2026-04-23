'use client'

import { useState } from 'react'
import { AlertTriangle, CreditCard, Landmark, RotateCcw, ShieldAlert, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionTitle, StatusPill, KpiCard } from '@/components/surface'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiQuery } from '@/hooks/use-api'
import { apiClient } from '@/lib/api'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  formatShortDate,
  formatTry,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
} from '@/lib/formatters'
import { PaymentMethod, PaymentStatus } from '@sakin/shared'
import { ViewStatePanel } from '@/components/view-state-panel'
import { UI_COPY } from '@/lib/ui-copy'

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
  meta: { total: number; page: number; limit: number; totalPages: number }
  summary: {
    monthTotal: number
    methodTotals: { onlineCard: number; bankTransfer: number; cash: number; pos: number }
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
  meta: { total: number; page: number; limit: number; totalPages: number }
}

function suspiciousReasonLabel(code: string) {
  if (code === 'PENDING_STALE') return 'Uzun süredir bekliyor'
  if (code === 'MISSING_RECEIPT') return 'Makbuz eksik'
  if (code === 'HIGH_AMOUNT_FAILED') return 'Yüksek tutarlı başarısız'
  return code
}

interface PaymentsPanelProps {
  siteId: string
}

const PAYMENTS_LIMIT = 20

export function PaymentsPanel({ siteId }: PaymentsPanelProps) {
  const [search, setSearch] = useState('')
  const [committedSearch, setCommittedSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL')
  const [page, setPage] = useState(1)

  const resetPage = () => setPage(1)

  const listParams = {
    siteId,
    page,
    limit: PAYMENTS_LIMIT,
    search: committedSearch.trim() || undefined,
    method: methodFilter === 'ALL' ? undefined : methodFilter,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  }

  const { data: payments, isLoading: listLoading, error: listError, refetch } = useApiQuery<PaymentsListResponse>(
    ['payments', listParams],
    '/payments',
    listParams,
    { enabled: !!siteId },
  )

  const { data: reconciliation, isLoading: reconLoading, error: reconError } = useApiQuery<ReconciliationResponse>(
    ['payments-reconciliation', siteId],
    '/payments/reconciliation-summary',
    { siteId },
    { enabled: !!siteId },
  )

  const { data: suspicious, isLoading: suspLoading, error: suspiciousError } = useApiQuery<SuspiciousResponse>(
    ['payments-suspicious', siteId],
    '/payments/suspicious',
    { siteId, page: 1, limit: 20 },
    { enabled: !!siteId },
  )

  const handleFilter = () => {
    setCommittedSearch(search)
    resetPage()
  }

  const handleClearFilters = () => {
    setSearch('')
    setCommittedSearch('')
    setMethodFilter('ALL')
    setStatusFilter('ALL')
    resetPage()
  }

  const hasActiveFilters = committedSearch || methodFilter !== 'ALL' || statusFilter !== 'ALL'

  if (listError || reconError) {
    return (
      <ViewStatePanel
        state="error"
        title={UI_COPY.payments.loadErrorTitle}
        description={
          listError instanceof Error
            ? listError.message
            : reconError instanceof Error
              ? reconError.message
              : UI_COPY.payments.loadErrorDescription
        }
        actionLabel={UI_COPY.common.retry}
        actionHref="/payments"
      />
    )
  }

  const downloadCsv = async (kind: 'receipt' | 'audit') => {
    try {
      const endpoint = kind === 'receipt' ? '/payments/exports/receipt' : '/payments/exports/audit'
      const payload = await apiClient<{ fileName: string; csv: string; rowCount: number }>(endpoint, {
        params: {
          siteId,
          method: methodFilter === 'ALL' ? undefined : methodFilter,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          search: committedSearch.trim() || undefined,
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
      toastSuccess(`${payload.rowCount} satır ${kind === 'receipt' ? 'makbuz' : 'denetim'} raporu indirildi.`)
    } catch (err) {
      toastError(err instanceof Error ? err : 'CSV dışa aktarım başarısız')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {reconLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ledger-panel p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-32" />
            </div>
          ))
        ) : (
          <>
            <KpiCard label="Onaylı Tahsilat" value={formatTry(reconciliation?.totals.confirmedAmount ?? 0)} icon={Wallet} tone="emerald" />
            <KpiCard label="Bekleyen Tutar" value={formatTry(reconciliation?.totals.pendingAmount ?? 0)} icon={RotateCcw} tone="amber" />
            <KpiCard label="Başarısız Tutar" value={formatTry(reconciliation?.totals.failedAmount ?? 0)} icon={Landmark} tone="rose" />
            <KpiCard label="Şüpheli İşlem" value={suspicious?.meta.total ?? 0} icon={ShieldAlert} tone="navy" />
          </>
        )}
      </div>

      <div className="ledger-panel-soft p-3 md:p-4">
        <div className="mb-3">
          <p className="ledger-label">{UI_COPY.paymentsPanel.filtersTitle}</p>
          <p className="mt-1 text-sm text-[#6b7d93]">{UI_COPY.paymentsPanel.filtersSubtitle}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFilter() }}
            className="ledger-input bg-white lg:col-span-2"
            placeholder={UI_COPY.paymentsPanel.searchPlaceholder}
          />
          <select
            value={methodFilter}
            onChange={(e) => { setMethodFilter(e.target.value as typeof methodFilter); resetPage() }}
            className="ledger-input bg-white"
          >
            <option value="ALL">Tüm Yöntemler</option>
            <option value={PaymentMethod.ONLINE_CARD}>Online Kart</option>
            <option value={PaymentMethod.BANK_TRANSFER}>Banka Transferi</option>
            <option value={PaymentMethod.CASH}>Nakit</option>
            <option value={PaymentMethod.POS}>POS</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); resetPage() }}
            className="ledger-input bg-white"
          >
            <option value="ALL">Tüm Durumlar</option>
            <option value={PaymentStatus.PENDING}>Bekliyor</option>
            <option value={PaymentStatus.CONFIRMED}>Onaylandı</option>
            <option value={PaymentStatus.FAILED}>Başarısız</option>
            <option value={PaymentStatus.CANCELLED}>İptal Edildi</option>
            <option value={PaymentStatus.REFUNDED}>İade Edildi</option>
          </select>
          <div className="flex gap-2">
            <Button type="button" className="flex-1" onClick={handleFilter}>
              {UI_COPY.paymentsPanel.filterButton}
            </Button>
            {hasActiveFilters && (
              <Button type="button" variant="outline" onClick={handleClearFilters}>
                {UI_COPY.paymentsPanel.clearButton}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void downloadCsv('receipt')}>
          {UI_COPY.paymentsPanel.receiptReportButton}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void downloadCsv('audit')}>
          {UI_COPY.paymentsPanel.auditReportButton}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          {UI_COPY.paymentsPanel.refreshButton}
        </Button>
      </div>

      <div className="ledger-panel overflow-hidden">
        <SectionTitle
          title={UI_COPY.paymentsPanel.sectionTitle}
          subtitle={payments?.meta ? `${payments.meta.total} ${UI_COPY.paymentsPanel.sectionSubtitleResultSuffix}` : UI_COPY.paymentsPanel.sectionSubtitleFallback}
        />
        <div className="hidden xl:block min-w-[800px] overflow-x-auto">
          <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
            <span className="col-span-2">Daire</span>
            <span className="col-span-2 text-right">Tutar</span>
            <span className="col-span-2">Yöntem</span>
            <span className="col-span-2">Durum</span>
            <span className="col-span-2">Makbuz</span>
            <span className="col-span-2">Tarih</span>
          </div>
          <div className="ledger-divider">
            {listLoading && Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 px-5 py-3 gap-3 items-center">
                <Skeleton className="col-span-2 h-10 rounded" />
                <Skeleton className="col-span-2 h-10 rounded" />
                <Skeleton className="col-span-2 h-10 rounded" />
                <Skeleton className="col-span-2 h-10 rounded" />
                <Skeleton className="col-span-2 h-10 rounded" />
                <Skeleton className="col-span-2 h-10 rounded" />
              </div>
            ))}
            {!listLoading && payments?.data.map((row) => (
              <div key={row.id} className="grid grid-cols-12 px-5 py-3 items-center text-sm ledger-table-row-hover">
                <div className="col-span-2">
                  <p className="font-semibold text-[#0c1427]">{row.unit.number}</p>
                  <p className="text-[11px] text-[#6b7280]">{row.unit.site.name}</p>
                </div>
                <p className="col-span-2 text-right tabular-nums">{formatTry(Number(row.amount))}</p>
                <p className="col-span-2">{paymentMethodLabel(row.method)}</p>
                <span className="col-span-2">
                  <StatusPill label={paymentStatusLabel(row.status)} tone={paymentStatusTone(row.status)} />
                </span>
                <p className="col-span-2 text-xs text-[#445266]">{row.receiptNumber ?? '-'}</p>
                <p className="col-span-2 text-xs text-[#445266]">{formatShortDate(row.paidAt ?? row.createdAt)}</p>
              </div>
            ))}
            {!listLoading && !payments?.data.length && (
              <EmptyState
                icon={CreditCard}
                title={UI_COPY.paymentsPanel.emptyTitle}
                description={UI_COPY.paymentsPanel.emptyDescription}
              />
            )}
          </div>

          {/* Pagination */}
          {payments?.meta && payments.meta.totalPages > 1 && (
            <div className="px-5 py-3 flex items-center justify-between border-t border-[#e5e7eb]">
              <p className="text-xs text-[#6b7280]">
                Sayfa {payments.meta.page} / {payments.meta.totalPages} · Toplam {payments.meta.total} kayıt
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Önceki
                </Button>
                {Array.from({ length: payments.meta.totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === payments.meta.totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | 'dots')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('dots')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((item, idx) =>
                    item === 'dots' ? (
                      <span key={`dots-${idx}`} className="px-1 text-xs text-[#9ca3af]">…</span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPage(item)}
                        className={`h-8 min-w-[32px] rounded text-xs font-medium transition-colors ${
                          item === page
                            ? 'bg-[#0c1427] text-white'
                            : 'text-[#6b7280] hover:bg-[#f3f4f6]'
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= payments.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="xl:hidden p-3 space-y-2">
          {listLoading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[20px] border border-white/80 bg-white/70 p-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-2 h-3 w-28" />
              <Skeleton className="mt-3 h-9 w-full" />
            </div>
          ))}
          {!listLoading && payments?.data.map((row) => (
            <div key={row.id} className="rounded-[20px] border border-white/80 bg-white/78 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0c1427]">
                    {row.unit.site.name} / {row.unit.number}
                  </p>
                  <p className="mt-1 text-xs text-[#617287]">
                    {paymentMethodLabel(row.method)} · {formatShortDate(row.paidAt ?? row.createdAt)}
                  </p>
                </div>
                <StatusPill label={paymentStatusLabel(row.status)} tone={paymentStatusTone(row.status)} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-[#f7faff] p-2">
                  <p className="text-[#6b7d93]">Tutar</p>
                  <p className="mt-0.5 font-semibold text-[#102038] tabular-nums">{formatTry(Number(row.amount))}</p>
                </div>
                <div className="rounded-xl bg-[#f7faff] p-2">
                  <p className="text-[#6b7d93]">Makbuz</p>
                  <p className="mt-0.5 font-semibold text-[#102038]">{row.receiptNumber ?? '-'}</p>
                </div>
              </div>
            </div>
          ))}
          {!listLoading && !payments?.data.length && (
            <EmptyState
              icon={CreditCard}
              title={UI_COPY.paymentsPanel.emptyTitle}
              description={UI_COPY.paymentsPanel.emptyDescription}
            />
          )}
        </div>
      </div>

      <div className="ledger-panel overflow-hidden">
        <SectionTitle title={UI_COPY.paymentsPanel.suspiciousTitle} subtitle={UI_COPY.paymentsPanel.suspiciousSubtitle} />
        <div className="ledger-divider">
          {suspLoading && Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="px-5 py-3"><Skeleton className="h-10 w-full" /></div>
          ))}
          {!suspLoading && suspiciousError && (
            <div className="px-5 py-3 text-sm text-[#ba1a1a]">
              {UI_COPY.paymentsPanel.suspiciousLoadError}
            </div>
          )}
          {!suspLoading && suspicious?.data.map((row) => (
            <div key={row.id} className="px-5 py-3 border-b border-[#e6e8ea] text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#0c1427]">
                  {row.unit.site.name} / {row.unit.number} • {formatTry(Number(row.amount))}
                </p>
                <StatusPill label={paymentStatusLabel(row.status)} tone={paymentStatusTone(row.status)} />
              </div>
              <p className="text-xs text-[#6b7280] mt-1">
                {row.reasons.map(suspiciousReasonLabel).join(' | ')} • {paymentMethodLabel(row.method)} • {formatShortDate(row.createdAt)}
              </p>
            </div>
          ))}
          {!suspLoading && !suspicious?.data.length && (
            <EmptyState
              icon={AlertTriangle}
              title={UI_COPY.paymentsPanel.suspiciousEmptyTitle}
              description={UI_COPY.paymentsPanel.suspiciousEmptyDescription}
            />
          )}
        </div>
      </div>
    </div>
  )
}
