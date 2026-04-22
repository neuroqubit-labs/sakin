'use client'

import { useMemo, useState } from 'react'
import { ExpenseCategory, UserRole } from '@sakin/shared'
import { Filter, ReceiptText, TrendingDown, WalletCards } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { useAuth } from '@/providers/auth-provider'
import { toastSuccess } from '@/lib/toast'
import { formatShortDate, formatTry } from '@/lib/formatters'
import { KpiCard, SectionTitle } from '@/components/surface'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.MAINTENANCE]: 'Bakım',
  [ExpenseCategory.CLEANING]: 'Temizlik',
  [ExpenseCategory.SECURITY]: 'Güvenlik',
  [ExpenseCategory.UTILITIES]: 'Faturalar',
  [ExpenseCategory.INSURANCE]: 'Sigorta',
  [ExpenseCategory.MANAGEMENT_FEE]: 'Yönetim Ücreti',
  [ExpenseCategory.OTHER]: 'Diğer',
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
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
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

interface ExpenseRow {
  id: string
  siteId: string
  amount: number
  category: ExpenseCategory
  description: string
  date: string
  receiptUrl: string | null
  site?: { name: string }
}

interface ExpensesPanelProps {
  siteId: string
}

const LIMIT = 20

export function ExpensesPanel({ siteId }: ExpensesPanelProps) {
  const { role } = useAuth()
  const isTenantAdmin = role === UserRole.TENANT_ADMIN
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [page, setPage] = useState(1)

  const queryParams: Record<string, string | number | boolean | undefined> = {
    siteId,
    category: filterCategory === 'ALL' ? undefined : filterCategory,
    limit: LIMIT,
    page,
  }

  const { data: expensesResponse, isLoading } = useApiQuery<{ data: ExpenseRow[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
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

  const totalExpense = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)

  const categorySummary = useMemo(
    () => Object.values(ExpenseCategory)
      .map((category) => {
        const items = expenses.filter((expense) => expense.category === category)
        return {
          category,
          total: items.reduce((sum, expense) => sum + Number(expense.amount), 0),
          count: items.length,
        }
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.total - a.total),
    [expenses],
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ledger-panel p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))
        ) : (
          <>
            <KpiCard label="Toplam Gider" value={formatTry(totalExpense)} hint="Bu sayfadaki toplam harcama." icon={TrendingDown} tone="rose" />
            <KpiCard label="Kayıt Sayısı" value={meta?.total ?? expenses.length} hint="Filtreye uyan gider adedi." icon={ReceiptText} tone="navy" />
            <KpiCard
              label={categorySummary[0] ? CATEGORY_LABELS[categorySummary[0].category] : 'Kategori'}
              value={categorySummary[0] ? formatTry(categorySummary[0].total) : '-'}
              hint={categorySummary[0] ? `${categorySummary[0].count} kayıt ile en yüksek gider alanı.` : 'Henüz dağılım yok.'}
              icon={WalletCards}
              tone="amber"
            />
            <KpiCard
              label={categorySummary[1] ? CATEGORY_LABELS[categorySummary[1].category] : 'İkinci Alan'}
              value={categorySummary[1] ? formatTry(categorySummary[1].total) : '-'}
              hint={categorySummary[1] ? `${categorySummary[1].count} kayıt.` : '-'}
              icon={Filter}
              tone="blue"
            />
          </>
        )}
      </div>

      <div className="ledger-panel-soft p-3 md:p-4">
        <div className="mb-3">
          <p className="ledger-label">Kategori Filtresi</p>
          <p className="mt-1 text-sm text-[#6b7d93]">Belirli gider grubunu filtreleyin.</p>
        </div>
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
          className="ledger-input bg-white max-w-sm"
        >
          <option value="ALL">Tüm Kategoriler</option>
          {Object.values(ExpenseCategory).map((category) => (
            <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
          ))}
        </select>
      </div>

      <div className="ledger-panel overflow-hidden">
        <SectionTitle
          title="Gider Kayıtları"
          subtitle={meta ? `${meta.total} kayıt bulundu.` : 'Tarih, kategori ve açıklama kırılımıyla gider hareketleri.'}
        />
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-12 px-5 py-3 ledger-table-head text-xs">
              <span className="col-span-2">Tarih</span>
              <span className="col-span-2">Kategori</span>
              <span className="col-span-4">Açıklama</span>
              <span className={`${isTenantAdmin ? 'col-span-2' : 'col-span-4'} text-right`}>Tutar</span>
              {isTenantAdmin && <span className="col-span-2 text-right">Aksiyon</span>}
            </div>
            <div className="ledger-divider">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-4">
                    <Skeleton className="h-12 w-full rounded-2xl" />
                  </div>
                ))
              ) : expenses.length === 0 ? (
                <EmptyState
                  icon={TrendingDown}
                  title="Gider kaydı bulunamadı"
                  description="Filtreye uygun gider yok. Yeni gider eklemek için Aidat Planla sayfasını kullanın."
                />
              ) : (
                expenses.map((expense) => (
                  <div key={expense.id} className="grid grid-cols-12 px-5 py-4 items-center ledger-table-row-hover">
                    <p className="col-span-2 text-sm tabular-nums text-[#0c1427]">{formatShortDate(expense.date)}</p>
                    <div className="col-span-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[expense.category]}`}>
                        {CATEGORY_LABELS[expense.category]}
                      </span>
                    </div>
                    <p className="col-span-4 truncate text-sm text-[#374151]">{expense.description}</p>
                    <p className={`${isTenantAdmin ? 'col-span-2' : 'col-span-4'} text-right text-sm font-semibold tabular-nums text-[#ba1a1a]`}>
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

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="px-5 py-3 flex items-center justify-between border-t border-[#e5e7eb]">
                <p className="text-xs text-[#6b7280]">
                  Sayfa {meta.page} / {meta.totalPages} · Toplam {meta.total} kayıt
                </p>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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
