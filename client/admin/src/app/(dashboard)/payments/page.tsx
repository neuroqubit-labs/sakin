'use client'

import { useState } from 'react'
import { AlertTriangle, CreditCard, Landmark, Receipt, RotateCcw, ShieldAlert, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader, SectionTitle, StatusPill, KpiCard } from '@/components/surface'
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

export default function PaymentsPage() {
  const { role } = useAuth()
  const { selectedSiteId, hydrated } = useSiteContext()
  const isTenantAdmin = role === UserRole.TENANT_ADMIN

  const [search, setSearch] = useState('')
  const [committedSearch, setCommittedSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL')

  const queryEnabled = hydrated && !!selectedSiteId && isTenantAdmin

  const listParams = {
    siteId: selectedSiteId ?? undefined,
    page: 1,
    limit: 50,
    search: committedSearch.trim() || undefined,
    method: methodFilter === 'ALL' ? undefined : methodFilter,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  }

  const { data: payments, isLoading: listLoading, refetch } = useApiQuery<PaymentsListResponse>(
    ['payments', listParams],
    '/payments',
    listParams,
    { enabled: queryEnabled },
  )

  const { data: reconciliation, isLoading: reconLoading } = useApiQuery<ReconciliationResponse>(
    ['payments-reconciliation', selectedSiteId],
    '/payments/reconciliation-summary',
    { siteId: selectedSiteId! },
    { enabled: queryEnabled },
  )

  const { data: suspicious, isLoading: suspLoading } = useApiQuery<SuspiciousResponse>(
    ['payments-suspicious', selectedSiteId],
    '/payments/suspicious',
    { siteId: selectedSiteId!, page: 1, limit: 20 },
    { enabled: queryEnabled },
  )

  const handleFilter = () => {
    setCommittedSearch(search)
  }

  const downloadCsv = async (kind: 'receipt' | 'audit') => {
    if (!selectedSiteId || !isTenantAdmin) return
    try {
      const endpoint = kind === 'receipt' ? '/payments/exports/receipt' : '/payments/exports/audit'
      const payload = await apiClient<{ fileName: string; csv: string; rowCount: number }>(endpoint, {
        params: {
          siteId: selectedSiteId,
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
    <div className="space-y-6 motion-in">
      <PageHeader
        title="Ödemeler"
        eyebrow="Finans Operasyonu"
        subtitle="Tahsilat takibi, mutabakat ve şüpheli işlem denetimi."
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void downloadCsv('receipt')}>
              Makbuz Raporu
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void downloadCsv('audit')}>
              Denetim Raporu
            </Button>
            <Button type="button" size="sm" onClick={() => void refetch()}>
              Yenile
            </Button>
          </div>
        }
      />

      {!selectedSiteId && hydrated && <p className="text-sm text-[#6b7280]">Ödeme raporu için önce bir site seçin.</p>}

      {!isTenantAdmin && (
        <div className="ledger-panel p-6">
          <p className="text-sm text-[#6b7280]">Bu ekran yönetici seviyesinde tahsilat denetimi içindir. Personel işlemleri Genel Bakış ekranından devam eder.</p>
        </div>
      )}

      {isTenantAdmin && selectedSiteId && (
        <>
          <div className="motion-stagger grid grid-cols-1 lg:grid-cols-4 gap-3">
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
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="ledger-label">Filtreleme</p>
                <p className="mt-1 text-sm text-[#6b7d93]">Makbuz, yöntem ve durum filtresiyle tahsilat akışını daralt.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleFilter() }}
                className="ledger-input bg-white lg:col-span-2"
                placeholder="Makbuz, not, daire no ara..."
              />
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value as typeof methodFilter)}
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
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="ledger-input bg-white"
              >
                <option value="ALL">Tüm Durumlar</option>
                <option value={PaymentStatus.PENDING}>Bekliyor</option>
                <option value={PaymentStatus.CONFIRMED}>Onaylandı</option>
                <option value={PaymentStatus.FAILED}>Başarısız</option>
                <option value={PaymentStatus.CANCELLED}>İptal Edildi</option>
                <option value={PaymentStatus.REFUNDED}>İade Edildi</option>
              </select>
              <button
                type="button"
                onClick={handleFilter}
                className="rounded-2xl border border-[#17345a]/12 bg-[linear-gradient(135deg,#12203a_0%,#1d3b67_46%,#4f7df7_100%)] px-3 py-2 text-xs font-semibold text-white shadow-[0_16px_28px_rgba(79,125,247,0.2)]"
              >
                Filtrele
              </button>
            </div>
          </div>

          <div className="ledger-panel overflow-x-auto">
            <SectionTitle title="Tahsilat Akışı" subtitle="Filtreye uyan ödeme kayıtları ve durumları." />
            <div className="min-w-[800px]">
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
                  title="Ödeme bulunamadı"
                  description="Filtreye uygun ödeme kaydı yok."
                />
              )}
            </div>
            </div>
          </div>

          <div className="ledger-panel overflow-hidden">
            <SectionTitle title="Şüpheli İşlemler" subtitle="İnceleme gerektiren tahsilat kayıtları." />
            <div className="ledger-divider">
              {suspLoading && Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="px-5 py-3"><Skeleton className="h-10 w-full" /></div>
              ))}
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
              {!suspLoading && !suspicious?.data.length && <EmptyState icon={AlertTriangle} title="Şüpheli ödeme yok" description="Şu an inceleme gerektiren ödeme kaydı görünmüyor." />}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
