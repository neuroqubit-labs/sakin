'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useApiQuery } from '@/hooks/use-api'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/providers/auth-provider'
import { UserRole } from '@sakin/shared'
import { CircleDollarSign, FileText, Search } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { KpiCard, SectionTitle, StatusPill } from '@/components/surface'
import { duesStatusLabel, duesStatusTone, formatShortDate, formatTry } from '@/lib/formatters'
import { toastSuccess } from '@/lib/toast'
import { Skeleton } from '@/components/ui/skeleton'
import { ViewStatePanel } from '@/components/view-state-panel'
import { UI_COPY } from '@/lib/ui-copy'

interface DuesRow {
  id: string
  amount: string | number
  paidAmount: string | number
  remainingAmount: string | number
  status: string
  periodMonth: number
  periodYear: number
  dueDate: string
  description?: string | null
  unit: { number: string; floor: number | null; site: { name: string } }
}

interface DuesListResponse {
  data: DuesRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

interface DuesRecordsPanelProps {
  siteId: string
  initialStatusFilter?: string
  onCollect?: (payload: {
    duesId: string
    unitNumber: string
    siteName: string
    remainingAmount: number
  }) => void
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tüm Durumlar' },
  { value: 'PENDING', label: 'Bekliyor' },
  { value: 'PARTIALLY_PAID', label: 'Kısmi Ödendi' },
  { value: 'OVERDUE', label: 'Gecikmiş' },
  { value: 'PAID', label: 'Ödendi' },
  { value: 'WAIVED', label: 'Affedildi' },
]

const LIMIT = 20

export function DuesRecordsPanel({ siteId, initialStatusFilter, onCollect }: DuesRecordsPanelProps) {
  const { role } = useAuth()
  const queryClient = useQueryClient()
  const isTenantAdmin = role === UserRole.TENANT_ADMIN

  const normalizedStatus = STATUS_OPTIONS.some((opt) => opt.value === initialStatusFilter) ? initialStatusFilter : 'ALL'
  const [statusFilter, setStatusFilter] = useState(normalizedStatus ?? 'ALL')
  const [page, setPage] = useState(1)
  const [waivingId, setWaivingId] = useState<string | null>(null)
  const [confirmingWaiveId, setConfirmingWaiveId] = useState<string | null>(null)

  // Search & period filters
  const [searchInput, setSearchInput] = useState('')
  const [committedSearch, setCommittedSearch] = useState('')
  const [periodMonth, setPeriodMonth] = useState('')
  const [periodYear, setPeriodYear] = useState('')

  useEffect(() => {
    const next = STATUS_OPTIONS.some((opt) => opt.value === initialStatusFilter) ? initialStatusFilter : 'ALL'
    setStatusFilter(next ?? 'ALL')
    setPage(1)
  }, [initialStatusFilter])

  const resetPage = () => setPage(1)

  const handleApplyFilters = () => {
    setCommittedSearch(searchInput)
    resetPage()
  }

  const handleClearFilters = () => {
    setSearchInput('')
    setCommittedSearch('')
    setStatusFilter('ALL')
    setPeriodMonth('')
    setPeriodYear('')
    resetPage()
  }

  const hasActiveFilters = committedSearch || statusFilter !== 'ALL' || periodMonth || periodYear

  const { data: duesData, isLoading, error } = useApiQuery<DuesListResponse>(
    ['dues-list', siteId, statusFilter, committedSearch, periodMonth, periodYear, page],
    '/dues',
    {
      siteId,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search: committedSearch.trim() || undefined,
      periodMonth: periodMonth ? Number(periodMonth) : undefined,
      periodYear: periodYear ? Number(periodYear) : undefined,
      page,
      limit: LIMIT,
    },
  )

  const rows = duesData?.data ?? []
  const meta = duesData?.meta

  const handleWaive = async (duesId: string) => {
    setWaivingId(duesId)
    try {
      await apiClient(`/dues/${duesId}/waive`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Yönetici tarafından borç affı' }),
      })
      toastSuccess('Aidat kaydı affedildi.')
      await queryClient.invalidateQueries({ queryKey: ['dues-list'] })
      await queryClient.invalidateQueries({ queryKey: ['work-summary'] })
      setConfirmingWaiveId(null)
    } catch {
      // error handled by apiClient
    } finally {
      setWaivingId(null)
    }
  }

  // Summary stats
  const openAmount = rows.reduce((sum, row) => sum + Math.max(0, Number(row.remainingAmount)), 0)
  const overdueCount = rows.filter((row) => row.status === 'OVERDUE').length

  // Generate year options (current year +/- 3)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i)

  if (error) {
    return (
      <ViewStatePanel
        state="error"
        title={UI_COPY.duesRecords.loadErrorTitle}
        description={error instanceof Error ? error.message : UI_COPY.duesRecords.loadErrorDescription}
        actionLabel={UI_COPY.common.financePageAction}
        actionHref="/finance"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label={UI_COPY.duesRecords.summary.totalLabel}
          value={meta?.total ?? rows.length}
          hint={UI_COPY.duesRecords.summary.totalHint}
          icon={FileText}
          tone="blue"
        />
        <KpiCard
          label={UI_COPY.duesRecords.summary.openBalanceLabel}
          value={formatTry(openAmount)}
          hint={UI_COPY.duesRecords.summary.openBalanceHint}
          icon={FileText}
          tone="amber"
        />
        <KpiCard
          label={UI_COPY.duesRecords.summary.overdueLabel}
          value={overdueCount}
          hint={UI_COPY.duesRecords.summary.overdueHint}
          icon={FileText}
          tone="rose"
        />
      </div>

      {/* Filters */}
      <div className="ledger-panel-soft p-3 md:p-4">
        <div className="mb-3">
          <p className="ledger-label">{UI_COPY.duesRecords.filtersTitle}</p>
          <p className="mt-1 text-sm text-[#6b7d93]">{UI_COPY.duesRecords.filtersSubtitle}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9ca3af]" aria-hidden="true" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleApplyFilters() }}
              className="ledger-input bg-white w-full pl-8"
              placeholder={UI_COPY.duesRecords.searchPlaceholder}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); resetPage() }}
            className="ledger-input bg-white"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={periodMonth}
            onChange={(e) => { setPeriodMonth(e.target.value); resetPage() }}
            className="ledger-input bg-white"
          >
            <option value="">Tüm Aylar</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {new Date(2000, i).toLocaleString('tr-TR', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={periodYear}
            onChange={(e) => { setPeriodYear(e.target.value); resetPage() }}
            className="ledger-input bg-white"
          >
            <option value="">Tüm Yıllar</option>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button type="button" className="flex-1" onClick={handleApplyFilters}>
              {UI_COPY.duesRecords.filterButton}
            </Button>
            {hasActiveFilters && (
              <Button type="button" variant="outline" onClick={handleClearFilters}>
                {UI_COPY.duesRecords.clearButton}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="ledger-panel overflow-hidden">
        <SectionTitle
          title={UI_COPY.duesRecords.sectionTitle}
          subtitle={meta ? `${meta.total} ${UI_COPY.duesRecords.sectionSubtitleResultSuffix}` : UI_COPY.duesRecords.sectionSubtitleFallback}
        />

        <div className="hidden xl:block overflow-x-auto">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
                <span className="col-span-2">Daire</span>
                <span className="col-span-2">Dönem</span>
                <span className="col-span-2 text-right">Tutar</span>
                <span className="col-span-2 text-right">Kalan</span>
                <span className="col-span-2">Durum</span>
                <span className="col-span-1">Vade</span>
                <span className="col-span-1 text-right">Aksiyon</span>
              </div>

              <div className="ledger-divider">
                {rows.map((row) => (
                  <div key={row.id} className="grid grid-cols-12 px-5 py-3 items-center text-sm ledger-table-row-hover">
                    <div className="col-span-2">
                      <p className="font-semibold text-[#0c1427]">{row.unit.number}</p>
                      <p className="text-[11px] text-[#6b7280]">{row.unit.site.name}</p>
                    </div>
                    <span className="col-span-2 tabular-nums text-[#0c1427]">{row.periodMonth}/{row.periodYear}</span>
                    <span className="col-span-2 text-right tabular-nums">{formatTry(Number(row.amount))}</span>
                    <span className="col-span-2 text-right tabular-nums font-semibold">{formatTry(Number(row.remainingAmount))}</span>
                    <span className="col-span-2">
                      <StatusPill label={duesStatusLabel(row.status)} tone={duesStatusTone(row.status)} />
                    </span>
                    <span className="col-span-1 text-xs text-[#6b7280]">{formatShortDate(row.dueDate)}</span>
                    <div className="col-span-1">
                      <div className="flex items-center justify-end gap-1">
                        {(row.status === 'PENDING' || row.status === 'OVERDUE' || row.status === 'PARTIALLY_PAID') && (
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 px-2.5 text-[11px]"
                            onClick={() =>
                              onCollect?.({
                                duesId: row.id,
                                unitNumber: row.unit.number,
                                siteName: row.unit.site.name,
                                remainingAmount: Math.max(0, Number(row.remainingAmount)),
                              })
                            }
                          >
                            <CircleDollarSign className="h-3.5 w-3.5" />
                            {UI_COPY.duesRecords.collectButton}
                          </Button>
                        )}
                        {isTenantAdmin && (row.status === 'PENDING' || row.status === 'OVERDUE') && (
                          confirmingWaiveId === row.id ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 px-2.5 text-[11px] bg-[#b42318] hover:bg-[#9f1f15]"
                                disabled={waivingId === row.id}
                                onClick={() => void handleWaive(row.id)}
                              >
                                {waivingId === row.id ? '...' : UI_COPY.duesRecords.waiveConfirmButton}
                              </Button>
                              <Button type="button" size="sm" variant="outline" className="h-8 px-2.5 text-[11px]" onClick={() => setConfirmingWaiveId(null)}>
                                {UI_COPY.duesRecords.cancelButton}
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2.5 text-[#ba1a1a]"
                              onClick={() => setConfirmingWaiveId(row.id)}
                            >
                              {UI_COPY.duesRecords.waiveButton}
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {rows.length === 0 && (
                  <EmptyState
                    icon={FileText}
                    title={UI_COPY.duesRecords.emptyTitle}
                    description={UI_COPY.duesRecords.emptyDescription}
                  />
                )}
              </div>
            </>
          )}
        </div>

        <div className="xl:hidden p-3 space-y-2">
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-[20px] border border-white/80 bg-white/72 p-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-2 h-3 w-24" />
              <Skeleton className="mt-3 h-9 w-full" />
            </div>
          ))}
          {!isLoading && rows.map((row) => (
            <div key={row.id} className="rounded-[20px] border border-white/80 bg-white/78 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0c1427]">
                    {row.unit.site.name} / {row.unit.number}
                  </p>
                  <p className="mt-1 text-xs text-[#617287]">
                    {row.periodMonth}/{row.periodYear} · Vade {formatShortDate(row.dueDate)}
                  </p>
                </div>
                <StatusPill label={duesStatusLabel(row.status)} tone={duesStatusTone(row.status)} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-[#f7faff] p-2">
                  <p className="text-[#6b7d93]">Tutar</p>
                  <p className="mt-0.5 font-semibold text-[#102038] tabular-nums">{formatTry(Number(row.amount))}</p>
                </div>
                <div className="rounded-xl bg-[#f7faff] p-2">
                  <p className="text-[#6b7d93]">Kalan</p>
                  <p className="mt-0.5 font-semibold text-[#b42318] tabular-nums">{formatTry(Number(row.remainingAmount))}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(row.status === 'PENDING' || row.status === 'OVERDUE' || row.status === 'PARTIALLY_PAID') && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 px-3 text-[11px]"
                    onClick={() =>
                      onCollect?.({
                        duesId: row.id,
                        unitNumber: row.unit.number,
                        siteName: row.unit.site.name,
                        remainingAmount: Math.max(0, Number(row.remainingAmount)),
                      })
                    }
                  >
                    <CircleDollarSign className="h-3.5 w-3.5" />
                    {UI_COPY.duesRecords.collectButton}
                  </Button>
                )}
                {isTenantAdmin && (row.status === 'PENDING' || row.status === 'OVERDUE') && (
                  confirmingWaiveId === row.id ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-3 text-[11px] bg-[#b42318] hover:bg-[#9f1f15]"
                        disabled={waivingId === row.id}
                        onClick={() => void handleWaive(row.id)}
                      >
                        {waivingId === row.id ? '...' : UI_COPY.duesRecords.waiveConfirmMobileButton}
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-8 px-3 text-[11px]" onClick={() => setConfirmingWaiveId(null)}>
                        {UI_COPY.duesRecords.cancelButton}
                      </Button>
                    </>
                  ) : (
                    <Button type="button" size="sm" variant="ghost" className="h-8 px-3 text-[11px] text-[#ba1a1a]" onClick={() => setConfirmingWaiveId(row.id)}>
                      {UI_COPY.duesRecords.waiveButton}
                    </Button>
                  )
                )}
              </div>
            </div>
          ))}
          {!isLoading && rows.length === 0 && (
            <EmptyState
              icon={FileText}
              title={UI_COPY.duesRecords.emptyTitle}
              description={UI_COPY.duesRecords.emptyDescription}
            />
          )}
        </div>

        {!isLoading && meta && meta.totalPages > 1 && (
          <div className="px-5 py-3 flex items-center justify-between border-t border-[#e5e7eb]">
            <p className="text-xs text-[#6b7280]">
              Sayfa {meta.page} / {meta.totalPages} · Toplam {meta.total} kayıt
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
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === meta.totalPages || Math.abs(p - page) <= 1)
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
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sonraki
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
