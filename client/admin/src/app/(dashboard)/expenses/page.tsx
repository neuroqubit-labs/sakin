'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateExpenseSchema, ExpenseCategory, type CreateExpenseDto } from '@sakin/shared'
import { Plus, TrendingDown } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { useSiteContext } from '@/providers/site-provider'
import { toastSuccess } from '@/lib/toast'
import { formatTry, formatShortDate } from '@/lib/formatters'
import { PageHeader } from '@/components/surface'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.MAINTENANCE]: 'Bakım',
  [ExpenseCategory.CLEANING]: 'Temizlik',
  [ExpenseCategory.SECURITY]: 'Güvenlik',
  [ExpenseCategory.UTILITIES]: 'Faturalar',
  [ExpenseCategory.INSURANCE]: 'Sigorta',
  [ExpenseCategory.MANAGEMENT_FEE]: 'Yönetim Ücreti',
  [ExpenseCategory.OTHER]: 'Diğer',
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.MAINTENANCE]: 'bg-blue-100 text-blue-700',
  [ExpenseCategory.CLEANING]: 'bg-green-100 text-green-700',
  [ExpenseCategory.SECURITY]: 'bg-purple-100 text-purple-700',
  [ExpenseCategory.UTILITIES]: 'bg-orange-100 text-orange-700',
  [ExpenseCategory.INSURANCE]: 'bg-cyan-100 text-cyan-700',
  [ExpenseCategory.MANAGEMENT_FEE]: 'bg-slate-100 text-slate-700',
  [ExpenseCategory.OTHER]: 'bg-gray-100 text-gray-700',
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

export default function ExpensesPage() {
  const { selectedSiteId, availableSites } = useSiteContext()
  const [showCreate, setShowCreate] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('ALL')

  const queryParams: Record<string, string | number | boolean | undefined> = {
    siteId: selectedSiteId ?? undefined,
    category: filterCategory === 'ALL' ? undefined : filterCategory,
    limit: 50,
  }

  const { data: expensesResponse, isLoading } = useApiQuery<{ data: ExpenseRow[]; meta: { total: number } }>(
    ['expenses', queryParams],
    '/expenses',
    queryParams,
    { enabled: !!selectedSiteId },
  )
  const expenses = expensesResponse?.data ?? []

  const [justCreated, setJustCreated] = useState(false)

  const createMutation = useApiMutation<ExpenseRow, CreateExpenseDto>('/expenses', {
    invalidateKeys: [['expenses']],
    onSuccess: () => {
      toastSuccess('Gider kaydedildi')
      setJustCreated(true)
      // Sticky defaults: keep category, siteId, date — clear amount and description
      const stickyCategory = form.getValues('category')
      const stickySiteId = form.getValues('siteId')
      const stickyDate = form.getValues('date')
      form.reset({
        category: stickyCategory,
        siteId: stickySiteId,
        date: stickyDate,
        amount: 0,
        description: '',
      })
    },
  })

  const deleteMutation = useApiMutation<void, { id: string }>(
    (vars) => `/expenses/${vars.id}`,
    {
      method: 'DELETE',
      invalidateKeys: [['expenses']],
      onSuccess: () => toastSuccess('Gider silindi'),
    },
  )

  const form = useForm<CreateExpenseDto>({
    resolver: zodResolver(CreateExpenseSchema),
    defaultValues: {
      siteId: selectedSiteId ?? '',
      amount: 0,
      category: ExpenseCategory.OTHER,
      description: '',
      date: new Date(),
    },
  })

  // Update siteId when selection changes
  if (selectedSiteId && form.getValues('siteId') !== selectedSiteId) {
    form.setValue('siteId', selectedSiteId)
  }

  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  const categorySummary = Object.values(ExpenseCategory).map((cat) => {
    const items = expenses.filter((e) => e.category === cat)
    return { category: cat, total: items.reduce((sum, e) => sum + Number(e.amount), 0), count: items.length }
  }).filter((c) => c.count > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Giderler"
        subtitle="Site bazlı gider kaydı ve takibi."
        actions={
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" /> Gider Ekle
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="ledger-panel p-4">
          <p className="ledger-label">Toplam Gider</p>
          <p className="ledger-value mt-2 text-[#ba1a1a]">{formatTry(totalExpense)}</p>
        </div>
        <div className="ledger-panel p-4">
          <p className="ledger-label">Kayıt Sayısı</p>
          <p className="ledger-value mt-2">{expenses.length}</p>
        </div>
        {categorySummary.slice(0, 2).map((cs) => (
          <div key={cs.category} className="ledger-panel p-4">
            <p className="ledger-label">{CATEGORY_LABELS[cs.category]}</p>
            <p className="ledger-value mt-2">{formatTry(cs.total)}</p>
            <p className="text-[11px] text-[#6b7280] mt-1">{cs.count} kayıt</p>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="ledger-panel p-5 space-y-4">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Yeni Gider</p>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <FormControl>
                      <select {...field} className="ledger-input bg-white w-full">
                        {Object.values(ExpenseCategory).map((cat) => (
                          <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tutar (₺)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tarih</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="siteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site</FormLabel>
                    <FormControl>
                      <select {...field} className="ledger-input bg-white w-full">
                        {availableSites.map((site) => (
                          <option key={site.id} value={site.id}>{site.name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Açıklama</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Gider açıklaması..." rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2 flex items-center gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Kaydediliyor...' : 'Gider Ekle'}
                </Button>
                {justCreated && (
                  <span className="text-xs font-medium text-[#006e2d]">Kaydedildi — aynı kategori ile devam edin</span>
                )}
                <div className="ml-auto">
                  <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setJustCreated(false) }}>Kapat</Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      )}

      {/* Filter */}
      <div className="ledger-panel-soft p-3 flex items-center gap-3">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="ledger-input bg-white"
        >
          <option value="ALL">Tüm Kategoriler</option>
          {Object.values(ExpenseCategory).map((cat) => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="ledger-panel overflow-x-auto">
        <div className="min-w-[800px]">
        <div className="grid grid-cols-12 px-5 py-3 ledger-table-head text-xs">
          <span className="col-span-2">Tarih</span>
          <span className="col-span-2">Kategori</span>
          <span className="col-span-4">Açıklama</span>
          <span className="col-span-2 text-right">Tutar</span>
          <span className="col-span-2 text-right">Aksiyon</span>
        </div>
        <div className="ledger-divider">
          {isLoading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-5 py-4"><Skeleton className="h-8 w-full" /></div>
          ))}
          {!isLoading && !selectedSiteId && (
            <EmptyState
              icon={TrendingDown}
              title="Site seçilmedi"
              description="Giderleri görmek için üst bardan bir bina seçin."
            />
          )}
          {!isLoading && selectedSiteId && expenses.length === 0 && (
            <EmptyState
              icon={TrendingDown}
              title="Gider kaydı yok"
              description="Bu site için henüz gider kaydı girilmemiş."
              actionLabel="İlk Gideri Ekle"
              onAction={() => setShowCreate(true)}
            />
          )}
          {!isLoading && expenses.map((expense) => (
            <div key={expense.id} className="grid grid-cols-12 px-5 py-3 items-center ledger-table-row-hover">
              <p className="col-span-2 text-sm tabular-nums text-[#0c1427]">{formatShortDate(expense.date)}</p>
              <div className="col-span-2">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[expense.category]}`}>
                  {CATEGORY_LABELS[expense.category]}
                </span>
              </div>
              <p className="col-span-4 text-sm text-[#374151] truncate">{expense.description}</p>
              <p className="col-span-2 text-right text-sm font-semibold tabular-nums text-[#ba1a1a]">
                {formatTry(Number(expense.amount))}
              </p>
              <div className="col-span-2 flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-[#ba1a1a]"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate({ id: expense.id })}
                >
                  Sil
                </Button>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}
