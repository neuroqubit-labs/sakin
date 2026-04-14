'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useApiQuery } from '@/hooks/use-api'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/providers/auth-provider'
import { UserRole } from '@sakin/shared'
import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { KpiCard, SectionTitle, StatusPill } from '@/components/surface'
import { duesStatusLabel, duesStatusTone, formatShortDate, formatTry } from '@/lib/formatters'
import { toastSuccess } from '@/lib/toast'
import { Skeleton } from '@/components/ui/skeleton'

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
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tüm Durumlar' },
  { value: 'PENDING', label: 'Bekliyor' },
  { value: 'PARTIALLY_PAID', label: 'Kısmi Ödendi' },
  { value: 'OVERDUE', label: 'Gecikmiş' },
  { value: 'PAID', label: 'Ödendi' },
  { value: 'WAIVED', label: 'Affedildi' },
]

export function DuesRecordsPanel({ siteId }: DuesRecordsPanelProps) {
  const { role } = useAuth()
  const queryClient = useQueryClient()
  const isTenantAdmin = role === UserRole.TENANT_ADMIN
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [waivingId, setWaivingId] = useState<string | null>(null)

  const { data: duesData, isLoading } = useApiQuery<DuesListResponse>(
    ['dues-list', siteId, statusFilter, page],
    '/dues',
    {
      siteId,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      page,
      limit: 50,
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
    } catch {
      // error handled by apiClient
    } finally {
      setWaivingId(null)
    }
  }

  // Summary stats
  const openAmount = rows.reduce((sum, row) => sum + Math.max(0, Number(row.remainingAmount)), 0)
  const overdueCount = rows.filter((row) => row.status === 'OVERDUE').length

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Toplam Kayıt" value={meta?.total ?? rows.length} hint="Seçili filtreye göre aidat satırları." icon={FileText} tone="blue" />
        <KpiCard label="Açık Bakiye" value={formatTry(openAmount)} hint="Ödenmemiş toplam borç miktarı." icon={FileText} tone="amber" />
        <KpiCard label="Gecikmiş" value={overdueCount} hint="Vadesi geçmiş aidat adedi." icon={FileText} tone="rose" />
      </div>

      {/* Table */}
      <div className="ledger-panel overflow-x-auto">
        <SectionTitle
          title="Aidat Kayıtları"
          subtitle="Daire bazında dönem, tutar ve durum dağılımı."
          actions={(
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="ledger-input bg-white text-xs"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        />

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}
          </div>
        ) : (
          <>
            <div className="hidden lg:grid grid-cols-12 px-5 py-3 ledger-table-head">
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
                <div key={row.id} className="grid grid-cols-1 lg:grid-cols-12 px-5 py-3 items-center text-sm ledger-table-row-hover gap-1 lg:gap-0">
                  <div className="lg:col-span-2">
                    <p className="font-semibold text-[#0c1427]">{row.unit.number}</p>
                    <p className="text-[11px] text-[#6b7280]">{row.unit.site.name}</p>
                  </div>
                  <span className="lg:col-span-2 tabular-nums text-[#0c1427]">{row.periodMonth}/{row.periodYear}</span>
                  <span className="lg:col-span-2 lg:text-right tabular-nums">{formatTry(Number(row.amount))}</span>
                  <span className="lg:col-span-2 lg:text-right tabular-nums font-semibold">{formatTry(Number(row.remainingAmount))}</span>
                  <span className="lg:col-span-2">
                    <StatusPill label={duesStatusLabel(row.status)} tone={duesStatusTone(row.status)} />
                  </span>
                  <span className="lg:col-span-1 text-xs text-[#6b7280]">{formatShortDate(row.dueDate)}</span>
                  <div className="lg:col-span-1 lg:text-right">
                    {isTenantAdmin && (row.status === 'PENDING' || row.status === 'OVERDUE') && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-[#ba1a1a]"
                        disabled={waivingId === row.id}
                        onClick={() => void handleWaive(row.id)}
                      >
                        {waivingId === row.id ? '...' : 'Affet'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {rows.length === 0 && (
                <EmptyState
                  icon={FileText}
                  title="Aidat kaydı bulunamadı"
                  description="Bu filtreyle eşleşen aidat yok — filtre ayarlarını değiştirin veya yeni dönem oluşturun."
                />
              )}
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="px-5 py-3 flex items-center justify-between border-t border-[#e5e7eb]">
                <p className="text-xs text-[#6b7280]">
                  Sayfa {meta.page} / {meta.totalPages} · Toplam {meta.total} kayıt
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Önceki
                  </Button>
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
          </>
        )}
      </div>
    </div>
  )
}
