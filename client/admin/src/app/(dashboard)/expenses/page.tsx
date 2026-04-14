'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateExpenseSchema, ExpenseCategory, type CreateExpenseDto } from '@sakin/shared'
import { Filter, Plus, ReceiptText, TrendingDown, WalletCards } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { useSiteContext } from '@/providers/site-provider'
import { toastSuccess } from '@/lib/toast'
import { formatShortDate, formatTry } from '@/lib/formatters'
import { KpiCard, PageHeader, SectionTitle } from '@/components/surface'
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

export default function ExpensesPage() {
  const { selectedSiteId, availableSites } = useSiteContext()
  const [showCreate, setShowCreate] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [justCreated, setJustCreated] = useState(false)

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

  const createMutation = useApiMutation<ExpenseRow, CreateExpenseDto>('/expenses', {
    invalidateKeys: [['expenses']],
    onSuccess: () => {
      toastSuccess('Gider kaydedildi')
      setJustCreated(true)
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

  useEffect(() => {
    if (selectedSiteId && form.getValues('siteId') !== selectedSiteId) {
      form.setValue('siteId', selectedSiteId)
    }
  }, [form, selectedSiteId])

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
    <div className="space-y-6 motion-in">
      <PageHeader
        title="Giderler"
        eyebrow="Finans Operasyonu"
        subtitle="Site bazlı harcamaları kategori, tutar ve kayıt yoğunluğu ile takip edin."
        actions={(
          <Button size="sm" onClick={() => setShowCreate((prev) => !prev)}>
            <Plus className="h-4 w-4" />
            Gider Ekle
          </Button>
        )}
      />

      <div className="motion-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ledger-panel p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))
        ) : (
          <>
            <KpiCard label="Toplam Gider" value={formatTry(totalExpense)} hint="Seçili filtre altında görünen toplam harcama." icon={TrendingDown} tone="rose" />
            <KpiCard label="Kayıt Sayısı" value={expenses.length} hint="Listeye giren gider hareketi adedi." icon={ReceiptText} tone="navy" />
            <KpiCard
              label={categorySummary[0] ? CATEGORY_LABELS[categorySummary[0].category] : 'Kategori Yoğunluğu'}
              value={categorySummary[0] ? formatTry(categorySummary[0].total) : '-'}
              hint={categorySummary[0] ? `${categorySummary[0].count} kayıt ile en yüksek gider alanı.` : 'Henüz kategori dağılımı oluşmadı.'}
              icon={WalletCards}
              tone="amber"
            />
            <KpiCard
              label={categorySummary[1] ? CATEGORY_LABELS[categorySummary[1].category] : 'İkinci Alan'}
              value={categorySummary[1] ? formatTry(categorySummary[1].total) : '-'}
              hint={categorySummary[1] ? `${categorySummary[1].count} kayıt ile ikinci yoğun alan.` : 'Yeni kayıt geldikçe dağılım görünür.'}
              icon={Filter}
              tone="blue"
            />
          </>
        )}
      </div>

      {showCreate ? (
        <div className="ledger-panel overflow-hidden">
          <SectionTitle
            title="Yeni gider kaydı"
            subtitle="Kategori, tutar ve site bağlamıyla operasyonel harcamayı sisteme kaydedin."
          />
          <div className="p-5">
            <div className="ledger-panel-soft p-4 md:p-5">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                  className="grid grid-cols-1 gap-4 md:grid-cols-2"
                >
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategori</FormLabel>
                        <FormControl>
                          <select {...field} className="ledger-input bg-white w-full">
                            {Object.values(ExpenseCategory).map((category) => (
                              <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
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
                        <FormLabel>Tutar (TL)</FormLabel>
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
                          <Textarea placeholder="Gider açıklaması..." rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Kaydediliyor...' : 'Gider Ekle'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreate(false)
                        setJustCreated(false)
                      }}
                    >
                      Kapat
                    </Button>
                    {justCreated ? (
                      <span className="text-xs font-medium text-[#0e7a52]">
                        Kaydedildi. Aynı kategori ile devam edebilirsiniz.
                      </span>
                    ) : null}
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      ) : null}

      <div className="ledger-panel-soft p-3 md:p-4">
        <div className="mb-3">
          <p className="ledger-label">Kategori filtresi</p>
          <p className="mt-1 text-sm text-[#6b7d93]">
            Belirli gider grubunu öne alarak bakım, fatura veya yönetim harcamalarını izole edin.
          </p>
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
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
          title="Gider kayıtları"
          subtitle="Tarih, kategori ve açıklama kırılımıyla son gider hareketleri."
        />
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-12 px-5 py-3 ledger-table-head text-xs">
              <span className="col-span-2">Tarih</span>
              <span className="col-span-2">Kategori</span>
              <span className="col-span-4">Açıklama</span>
              <span className="col-span-2 text-right">Tutar</span>
              <span className="col-span-2 text-right">Aksiyon</span>
            </div>
            <div className="ledger-divider">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-4">
                    <Skeleton className="h-12 w-full rounded-2xl" />
                  </div>
                ))
              ) : !selectedSiteId ? (
                <EmptyState
                  icon={TrendingDown}
                  title="Site seçilmedi"
                  description="Gider akışını görmek için üst bardan önce bir bina seçin."
                />
              ) : expenses.length === 0 ? (
                <EmptyState
                  icon={TrendingDown}
                  title="Henüz gider kaydı yok"
                  description="İlk gideri ekleyerek finansal takibi başlatın."
                  actionLabel="Gider Ekle"
                  onAction={() => setShowCreate(true)}
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
                    <p className="col-span-2 text-right text-sm font-semibold tabular-nums text-[#ba1a1a]">
                      {formatTry(Number(expense.amount))}
                    </p>
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
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
