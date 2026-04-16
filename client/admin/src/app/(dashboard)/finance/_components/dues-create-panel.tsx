'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DuesType, ExpenseCategory, UserRole } from '@sakin/shared'
import { CalendarRange, CircleDollarSign, Loader2, Package, TrendingDown } from 'lucide-react'
import { useApiMutation, useApiQuery } from '@/hooks/use-api'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionTitle } from '@/components/surface'
import { EmptyState } from '@/components/empty-state'
import { formatTry, formatShortDate } from '@/lib/formatters'
import { toastSuccess, toastError } from '@/lib/toast'
import { useAuth } from '@/providers/auth-provider'

// ─── Constants ──────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const CATEGORY_LABELS: Record<string, string> = {
  [ExpenseCategory.MAINTENANCE]: 'Bakım',
  [ExpenseCategory.CLEANING]: 'Temizlik',
  [ExpenseCategory.SECURITY]: 'Güvenlik',
  [ExpenseCategory.UTILITIES]: 'Faturalar',
  [ExpenseCategory.INSURANCE]: 'Sigorta',
  [ExpenseCategory.MANAGEMENT_FEE]: 'Yönetim Ücreti',
  [ExpenseCategory.ELEVATOR]: 'Asansör',
  [ExpenseCategory.HEATING_FUEL]: 'Isıtma Yakıtı',
  [ExpenseCategory.WATER]: 'Su',
  [ExpenseCategory.ELECTRICITY]: 'Elektrik',
  [ExpenseCategory.NATURAL_GAS]: 'Doğalgaz',
  [ExpenseCategory.GARDEN]: 'Bahçe',
  [ExpenseCategory.PEST_CONTROL]: 'İlaçlama',
  [ExpenseCategory.POOL]: 'Havuz',
  [ExpenseCategory.LEGAL]: 'Hukuki',
  [ExpenseCategory.TAXES]: 'Vergiler',
  [ExpenseCategory.STAFF_SALARY]: 'Personel Maaşı',
  [ExpenseCategory.RENOVATION]: 'Tadilat',
  [ExpenseCategory.EQUIPMENT]: 'Ekipman',
  [ExpenseCategory.COMMUNICATION]: 'İletişim',
  [ExpenseCategory.OTHER]: 'Diğer',
}

const DUES_TYPE_LABELS: Record<string, string> = {
  [DuesType.EXTRA]: 'Ek Gider',
  [DuesType.ASANSOR]: 'Asansör',
  [DuesType.ONARIM]: 'Onarım',
  [DuesType.YAKACAK]: 'Yakacak',
  [DuesType.ISLETME]: 'İşletme',
  [DuesType.OTOPARK]: 'Otopark',
  [DuesType.ORTAK_ALAN]: 'Ortak Alan',
  [DuesType.DIGER]: 'Diğer',
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PeriodSummaryRow {
  periodMonth: number
  periodYear: number
  _count: { id: number }
  _sum: { amount: { toNumber?: () => number } | number | null }
}

interface PeriodSummaryResponse {
  data: PeriodSummaryRow[]
}

interface DuesCreatePanelProps {
  siteId: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DuesCreatePanel({ siteId }: DuesCreatePanelProps) {
  return (
    <div className="space-y-6">
      <YearlyDuesPlan siteId={siteId} />
      <ExtraExpenseDistribution siteId={siteId} />
      <ExpensesListSection siteId={siteId} />
    </div>
  )
}

// ─── Section A: Yıllık Aidat Planı ─────────────────────────────────────────

function YearlyDuesPlan({ siteId }: { siteId: string }) {
  const { role } = useAuth()
  const isTenantAdmin = role === UserRole.TENANT_ADMIN
  const queryClient = useQueryClient()
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [year, setYear] = useState(currentYear)
  const [amount, setAmount] = useState<number>(0)
  const [fromMonth, setFromMonth] = useState(1)
  const [toMonth, setToMonth] = useState(12)
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Period summary — hangi aylar için borç oluşturulmuş
  const { data: summaryRes } = useApiQuery<PeriodSummaryResponse>(
    ['dues-period-summary', siteId, year],
    '/dues',
    { siteId, periodYear: year, limit: 200, page: 1 },
    { enabled: !!siteId },
  )

  const existingMonths = new Set(
    (summaryRes?.data ?? []).map((r: { periodMonth: number }) => r.periodMonth),
  )

  const handleGenerate = async () => {
    if (amount <= 0) return
    setGenerating(true)
    try {
      let totalCreated = 0
      let totalAll = 0
      for (let month = fromMonth; month <= toMonth; month++) {
        // eslint-disable-next-line no-await-in-loop
        const result = await apiClient<{ created: number; total: number }>('/dues/generate', {
          method: 'POST',
          body: JSON.stringify({
            siteId,
            periodMonth: month,
            periodYear: year,
            amount,
            type: DuesType.AIDAT,
            description: description || undefined,
          }),
        })
        totalCreated += result.created
        totalAll += result.total
      }
      toastSuccess(`${totalCreated} aidat kaydı oluşturuldu (${toMonth - fromMonth + 1} ay × ${totalAll > 0 ? Math.round(totalCreated / (toMonth - fromMonth + 1)) : 0} daire).`)
      await queryClient.invalidateQueries({ queryKey: ['dues-list'] })
      await queryClient.invalidateQueries({ queryKey: ['dues-period-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['work-summary'] })
    } catch (err) {
      toastError(err instanceof Error ? err : 'Aidat oluşturma başarısız')
    } finally {
      setGenerating(false)
    }
  }

  const handleBulkUpdate = async () => {
    if (amount <= 0) return
    setUpdating(true)
    try {
      const result = await apiClient<{ updated: number; total: number }>('/dues/bulk-update-amount', {
        method: 'PATCH',
        body: JSON.stringify({
          siteId,
          periodYear: year,
          newAmount: amount,
          fromMonth: currentMonth,
        }),
      })
      toastSuccess(`${result.updated} aidat kaydının tutarı güncellendi.`)
      await queryClient.invalidateQueries({ queryKey: ['dues-list'] })
      await queryClient.invalidateQueries({ queryKey: ['dues-period-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['work-summary'] })
    } catch (err) {
      toastError(err instanceof Error ? err : 'Tutar güncelleme başarısız')
    } finally {
      setUpdating(false)
    }
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i)

  return (
    <div className="ledger-panel overflow-hidden">
      <SectionTitle
        title="Yıllık Aidat Planı"
        subtitle="Seçili site için dönemsel aidat oluşturun veya mevcut tutarı güncelleyin."
        actions={<CalendarRange className="h-5 w-5 text-[#9ca3af]" aria-hidden="true" />}
      />

      <div className="p-5 space-y-4">
        <div className="ledger-panel-soft p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="ledger-label mb-1 block">Yıl</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="ledger-input bg-white w-full"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="ledger-label mb-1 block">Aylık Tutar (TL)</label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="1000"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="ledger-label mb-1 block">Başlangıç</label>
                <select
                  value={fromMonth}
                  onChange={(e) => setFromMonth(Number(e.target.value))}
                  className="ledger-input bg-white w-full"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ledger-label mb-1 block">Bitiş</label>
                <select
                  value={toMonth}
                  onChange={(e) => setToMonth(Number(e.target.value))}
                  className="ledger-input bg-white w-full"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="ledger-label mb-1 block">Açıklama (opsiyonel)</label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Aylık aidat, bakım aidatı vb."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={generating || amount <= 0 || fromMonth > toMonth}
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Oluşturuluyor…</>
              ) : (
                <><CircleDollarSign className="h-4 w-4" /> Aidat Oluştur</>
              )}
            </Button>
            {isTenantAdmin && existingMonths.size > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleBulkUpdate()}
                disabled={updating || amount <= 0}
              >
                {updating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Güncelleniyor…</>
                ) : (
                  'Ödenmemiş Ayları Güncelle'
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Mevcut dönem özeti */}
        {existingMonths.size > 0 && (
          <div>
            <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968] mb-2">
              {year} Yılı Dönem Durumu
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MONTH_NAMES.map((name, i) => {
                const month = i + 1
                const exists = existingMonths.has(month)
                return (
                  <span
                    key={month}
                    className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                      exists
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-[#f3f4f6] text-[#9ca3af] border border-[#e5e7eb]'
                    }`}
                  >
                    {name}
                  </span>
                )
              })}
            </div>
            <p className="text-[11px] text-[#9ca3af] mt-1.5">
              Yeşil aylar oluşturulmuş dönemleri gösterir. Tekrar oluşturma idempotent — varolan aylar atlanır.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section B: Tek Seferlik Ek Gider Dağıtımı ─────────────────────────────

function ExtraExpenseDistribution({ siteId }: { siteId: string }) {
  const { role } = useAuth()
  const isTenantAdmin = role === UserRole.TENANT_ADMIN
  const queryClient = useQueryClient()

  const [amount, setAmount] = useState<number>(0)
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.OTHER)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [distributionMethod, setDistributionMethod] = useState<'EQUAL' | 'AREA_BASED'>('EQUAL')
  const [duesType, setDuesType] = useState<DuesType>(DuesType.EXTRA)
  const [dueDate, setDueDate] = useState('')
  const [distribute, setDistribute] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (amount <= 0 || !description.trim()) return
    setSubmitting(true)
    const shouldDistribute = isTenantAdmin && distribute
    try {
      if (shouldDistribute) {
        const result = await apiClient<{ expense: unknown; distribution: { created: number; total: number } }>('/expenses/distribute', {
          method: 'POST',
          body: JSON.stringify({
            siteId,
            amount,
            category,
            description,
            date: new Date(date),
            distributionMethod,
            duesType,
            dueDate: dueDate ? new Date(dueDate) : new Date(date),
          }),
        })
        toastSuccess(`Gider kaydedildi ve ${result.distribution.created} daireye borç dağıtıldı.`)
      } else {
        await apiClient('/expenses', {
          method: 'POST',
          body: JSON.stringify({
            siteId,
            amount,
            category,
            description,
            date: new Date(date),
          }),
        })
        toastSuccess('Gider kaydedildi.')
      }

      await queryClient.invalidateQueries({ queryKey: ['expenses'] })
      await queryClient.invalidateQueries({ queryKey: ['dues-list'] })
      await queryClient.invalidateQueries({ queryKey: ['work-summary'] })

      // Reset form
      setAmount(0)
      setDescription('')
      setDueDate('')
    } catch (err) {
      toastError(err instanceof Error ? err : 'Gider oluşturma başarısız')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="ledger-panel overflow-hidden">
      <SectionTitle
        title="Tek Seferlik Ek Gider"
        subtitle="Asansör tamiri, ilaçlama gibi giderleri kaydedin ve dairelere borç olarak dağıtın."
        actions={<Package className="h-5 w-5 text-[#9ca3af]" aria-hidden="true" />}
      />

      <div className="p-5">
        <div className="ledger-panel-soft p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="ledger-label mb-1 block">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="ledger-input bg-white w-full"
              >
                {Object.values(ExpenseCategory).map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="ledger-label mb-1 block">Toplam Tutar (TL)</label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="5000"
              />
            </div>
            <div>
              <label className="ledger-label mb-1 block">Gider Tarihi</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="ledger-label mb-1 block">Açıklama</label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Asansör motor tamiri, bina ilaçlama vb."
            />
          </div>

          <div className="border-t border-[#e5e7eb] pt-4 space-y-3">
            {isTenantAdmin && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={distribute}
                  onChange={(e) => setDistribute(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-[#0c1427]">Dairelere borç olarak yansıt</span>
              </label>
            )}

            {isTenantAdmin && distribute && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-6">
                <div>
                  <label className="ledger-label mb-1 block">Dağıtım Yöntemi</label>
                  <select
                    value={distributionMethod}
                    onChange={(e) => setDistributionMethod(e.target.value as 'EQUAL' | 'AREA_BASED')}
                    className="ledger-input bg-white w-full"
                  >
                    <option value="EQUAL">Eşit Bölme</option>
                    <option value="AREA_BASED">m² Bazlı Oransal</option>
                  </select>
                </div>
                <div>
                  <label className="ledger-label mb-1 block">Borç Türü</label>
                  <select
                    value={duesType}
                    onChange={(e) => setDuesType(e.target.value as DuesType)}
                    className="ledger-input bg-white w-full"
                  >
                    {Object.entries(DUES_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="ledger-label mb-1 block">Borç Vade Tarihi</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || amount <= 0 || !description.trim()}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor…</>
              ) : (isTenantAdmin && distribute) ? (
                'Gider Oluştur ve Dağıt'
              ) : (
                'Gider Kaydet'
              )}
            </Button>
            {isTenantAdmin && distribute && amount > 0 && (
              <p className="text-xs text-[#6b7280]">
                Toplam {formatTry(amount)} tüm aktif dairelere {distributionMethod === 'EQUAL' ? 'eşit' : 'm² oranında'} dağıtılacak.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Section C: Gider Kayıtları ────────────────────────────────────────────

interface ExpenseRow {
  id: string
  siteId: string
  amount: number
  category: ExpenseCategory
  description: string
  date: string
  receiptUrl: string | null
}

const EXPENSE_LIMIT = 20

const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.MAINTENANCE]: 'bg-blue-100 text-blue-700',
  [ExpenseCategory.CLEANING]: 'bg-green-100 text-green-700',
  [ExpenseCategory.SECURITY]: 'bg-purple-100 text-purple-700',
  [ExpenseCategory.UTILITIES]: 'bg-orange-100 text-orange-700',
  [ExpenseCategory.INSURANCE]: 'bg-cyan-100 text-cyan-700',
  [ExpenseCategory.MANAGEMENT_FEE]: 'bg-slate-100 text-slate-700',
  [ExpenseCategory.OTHER]: 'bg-gray-100 text-gray-700',
  [ExpenseCategory.ELEVATOR]: 'bg-indigo-100 text-indigo-700',
  [ExpenseCategory.HEATING_FUEL]: 'bg-amber-100 text-amber-700',
  [ExpenseCategory.WATER]: 'bg-sky-100 text-sky-700',
  [ExpenseCategory.ELECTRICITY]: 'bg-yellow-100 text-yellow-700',
  [ExpenseCategory.NATURAL_GAS]: 'bg-orange-100 text-orange-800',
  [ExpenseCategory.GARDEN]: 'bg-lime-100 text-lime-700',
  [ExpenseCategory.PEST_CONTROL]: 'bg-red-100 text-red-700',
  [ExpenseCategory.POOL]: 'bg-teal-100 text-teal-700',
  [ExpenseCategory.LEGAL]: 'bg-rose-100 text-rose-700',
  [ExpenseCategory.TAXES]: 'bg-zinc-100 text-zinc-700',
  [ExpenseCategory.STAFF_SALARY]: 'bg-violet-100 text-violet-700',
  [ExpenseCategory.RENOVATION]: 'bg-stone-100 text-stone-700',
  [ExpenseCategory.EQUIPMENT]: 'bg-fuchsia-100 text-fuchsia-700',
  [ExpenseCategory.COMMUNICATION]: 'bg-pink-100 text-pink-700',
}

function ExpensesListSection({ siteId }: { siteId: string }) {
  const { role } = useAuth()
  const isTenantAdmin = role === UserRole.TENANT_ADMIN
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [page, setPage] = useState(1)

  const queryParams: Record<string, string | number | boolean | undefined> = {
    siteId,
    category: filterCategory === 'ALL' ? undefined : filterCategory,
    limit: EXPENSE_LIMIT,
    page,
  }

  const { data: expensesResponse, isLoading } = useApiQuery<{
    data: ExpenseRow[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }>(
    ['expenses', queryParams],
    '/expenses',
    queryParams,
    { enabled: !!siteId },
  )
  const expenses = expensesResponse?.data ?? []
  const meta = expensesResponse?.meta

  const deleteMutation = useApiMutation<void, { id: string }>(
    (vars) => `/expenses/${vars.id}`,
    {
      method: 'DELETE',
      invalidateKeys: [['expenses']],
      onSuccess: () => toastSuccess('Gider silindi'),
    },
  )

  return (
    <div className="ledger-panel overflow-hidden">
      <SectionTitle
        title="Gider Kayıtları"
        subtitle={meta ? `${meta.total} kayıt bulundu.` : 'Oluşturulan gider hareketleri.'}
        actions={<TrendingDown className="h-5 w-5 text-[#9ca3af]" aria-hidden="true" />}
      />

      <div className="p-5 space-y-4">
        <div className="ledger-panel-soft p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="ledger-label mb-1">Kategori Filtresi</p>
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
                className="ledger-input bg-white max-w-xs"
              >
                <option value="ALL">Tüm Kategoriler</option>
                {Object.values(ExpenseCategory).map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className={`grid ${isTenantAdmin ? 'grid-cols-12' : 'grid-cols-10'} px-5 py-3 ledger-table-head text-xs`}>
              <span className="col-span-2">Tarih</span>
              <span className="col-span-2">Kategori</span>
              <span className="col-span-4">Açıklama</span>
              <span className="col-span-2 text-right">Tutar</span>
              {isTenantAdmin && <span className="col-span-2 text-right">Aksiyon</span>}
            </div>
            <div className="ledger-divider">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-4">
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ))
              ) : expenses.length === 0 ? (
                <EmptyState
                  icon={TrendingDown}
                  title="Gider kaydı bulunamadı"
                  description="Filtreye uygun gider yok. Yukarıdaki formla yeni gider ekleyebilirsiniz."
                />
              ) : (
                expenses.map((expense) => (
                  <div key={expense.id} className={`grid ${isTenantAdmin ? 'grid-cols-12' : 'grid-cols-10'} px-5 py-4 items-center ledger-table-row-hover`}>
                    <p className="col-span-2 text-sm tabular-nums text-[#0c1427]">{formatShortDate(expense.date)}</p>
                    <div className="col-span-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${EXPENSE_CATEGORY_COLORS[expense.category]}`}>
                        {CATEGORY_LABELS[expense.category] ?? expense.category}
                      </span>
                    </div>
                    <p className="col-span-4 truncate text-sm text-[#374151]">{expense.description}</p>
                    <p className="col-span-2 text-right text-sm font-semibold tabular-nums text-[#ba1a1a]">
                      {formatTry(Number(expense.amount))}
                    </p>
                    {isTenantAdmin && (
                      <div className="col-span-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-[#ba1a1a]"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate({ id: expense.id })}
                        >
                          Sil
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className="px-5 py-3 flex items-center justify-between border-t border-[#e5e7eb]">
                <p className="text-xs text-[#6b7280]">
                  Sayfa {meta.page} / {meta.totalPages} · Toplam {meta.total} kayıt
                </p>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Önceki
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
