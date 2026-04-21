'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Landmark,
  Plus,
  Wallet,
  X,
} from 'lucide-react'
import {
  CreateCashAccountSchema,
  CreateCashTransactionSchema,
  CashAccountType,
  CashTransactionType,
  type CreateCashAccountDto,
  type CreateCashTransactionDto,
} from '@sakin/shared'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { useSiteContext } from '@/providers/site-provider'
import { KpiCard, PageHeader, SectionTitle } from '@/components/surface'
import { ScopedBreadcrumb } from '@/components/scoped-breadcrumb'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toastSuccess, toastError } from '@/lib/toast'
import { formatTry, formatShortDate } from '@/lib/formatters'

interface CashAccountRow {
  id: string
  siteId: string
  name: string
  type: CashAccountType
  bankName: string | null
  iban: string | null
  currency: string
  isActive: boolean
  balance: number
  site: { name: string }
}

interface CashTransactionRow {
  id: string
  amount: string | number
  type: CashTransactionType
  description: string
  transactionDate: string
  referenceType: string | null
}

interface CashAccountsResponse {
  data: CashAccountRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

interface CashTransactionsResponse {
  data: CashTransactionRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export default function CashPage() {
  const { selectedSiteId, availableSites, hydrated } = useSiteContext()
  const [showCreate, setShowCreate] = useState(false)
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const [showTxCreate, setShowTxCreate] = useState(false)

  const { data: accountsRes, isLoading: accountsLoading } = useApiQuery<CashAccountsResponse>(
    ['cash-accounts', { siteId: selectedSiteId }],
    '/cash-accounts',
    selectedSiteId ? { siteId: selectedSiteId, limit: 100 } : { limit: 100 },
    { enabled: hydrated },
  )

  const accounts = accountsRes?.data ?? []

  const stats = useMemo(() => {
    const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance ?? 0), 0)
    const cashBalance = accounts
      .filter((a) => a.type === CashAccountType.CASH)
      .reduce((sum, a) => sum + Number(a.balance ?? 0), 0)
    const bankBalance = accounts
      .filter((a) => a.type === CashAccountType.BANK)
      .reduce((sum, a) => sum + Number(a.balance ?? 0), 0)
    return { totalBalance, cashBalance, bankBalance, accountCount: accounts.length }
  }, [accounts])

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <div className="ledger-panel p-6">
          <Skeleton className="h-5 w-40 mb-3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  if (availableSites.length === 0) {
    return (
      <div className="space-y-6">
        <ScopedBreadcrumb module="Kasa & Banka" />
        <PageHeader title="Kasa & Banka" subtitle="Nakit kasa ve banka hesaplarını tek ekranda yönetin." />
        <div className="ledger-panel p-6">
          <EmptyState icon={Wallet} title="Önce bir bina oluşturun" description="Kasa ve banka hesapları bina bazında tanımlanır." />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 motion-in">
      <ScopedBreadcrumb module="Kasa & Banka" />
      <PageHeader
        title="Kasa & Banka"
        eyebrow="Finans Operasyonu"
        subtitle="Nakit kasa ve banka hesaplarını, bakiye ve işlem akışını tek ekranda yönetin."
        actions={(
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Yeni Hesap
          </Button>
        )}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Toplam Bakiye" value={formatTry(stats.totalBalance)} hint="Tüm hesapların güncel bakiye toplamı." icon={Wallet} tone="blue" />
        <KpiCard label="Nakit Kasa" value={formatTry(stats.cashBalance)} hint="Nakit kasalardaki toplam tutar." icon={Banknote} tone="emerald" />
        <KpiCard label="Banka Hesapları" value={formatTry(stats.bankBalance)} hint="Banka hesaplarındaki toplam tutar." icon={Landmark} tone="navy" />
        <KpiCard label="Hesap Sayısı" value={stats.accountCount} hint="Aktif kasa ve banka hesapları." icon={Wallet} tone="cyan" />
      </div>

      <div className="ledger-panel overflow-hidden">
        <SectionTitle title="Hesaplar" subtitle="Bir hesap seçerek işlemlerini görüntüleyin ve yeni işlem ekleyin." />
        <div className="p-5">
          {accountsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Henüz hesap yok"
              description="İlk kasa veya banka hesabınızı oluşturarak başlayın."
              actionLabel="Yeni Hesap"
              onAction={() => setShowCreate(true)}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setActiveAccountId(account.id)}
                  className="group text-left rounded-2xl border border-white/80 bg-white/62 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/82"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${account.type === 'BANK' ? 'bg-[#e8f0ff] text-[#17345a]' : 'bg-[#eaf6ee] text-[#14532d]'}`}>
                        {account.type === 'BANK' ? <Landmark className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0c1427] truncate">{account.name}</p>
                        <p className="text-[11px] text-[#6b7280] mt-0.5">
                          {account.site.name}{account.bankName ? ` · ${account.bankName}` : ''}
                        </p>
                        {account.iban && <p className="text-[10px] text-[#8b9bb0] mt-0.5 font-mono">{account.iban}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b9bb0]">Bakiye</p>
                      <p className={`text-[15px] font-semibold ${Number(account.balance) < 0 ? 'text-[#ba1a1a]' : 'text-[#0c1427]'}`}>
                        {formatTry(Number(account.balance))}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateAccountModal
          defaultSiteId={selectedSiteId}
          sites={availableSites}
          onClose={() => setShowCreate(false)}
        />
      )}

      {activeAccountId && (
        <AccountTransactionsDrawer
          account={accounts.find((a) => a.id === activeAccountId) ?? null}
          onClose={() => setActiveAccountId(null)}
          onOpenCreate={() => setShowTxCreate(true)}
        />
      )}

      {showTxCreate && activeAccountId && (
        <CreateTransactionModal
          cashAccountId={activeAccountId}
          onClose={() => setShowTxCreate(false)}
        />
      )}
    </div>
  )
}

function CreateAccountModal({
  defaultSiteId,
  sites,
  onClose,
}: {
  defaultSiteId: string | null
  sites: Array<{ id: string; name: string }>
  onClose: () => void
}) {
  const form = useForm<CreateCashAccountDto>({
    resolver: zodResolver(CreateCashAccountSchema),
    defaultValues: {
      siteId: defaultSiteId ?? (sites[0]?.id ?? ''),
      name: '',
      type: CashAccountType.CASH,
      bankName: '',
      iban: '',
      currency: 'TRY',
    },
  })

  const createMutation = useApiMutation<CashAccountRow, CreateCashAccountDto>('/cash-accounts', {
    method: 'POST',
    invalidateKeys: [['cash-accounts']],
    onSuccess: () => {
      toastSuccess('Hesap oluşturuldu')
      onClose()
    },
  })

  const type = form.watch('type')

  const onSubmit = (values: CreateCashAccountDto) => {
    const payload: CreateCashAccountDto = {
      ...values,
      bankName: values.bankName || undefined,
      iban: values.iban || undefined,
    }
    createMutation.mutate(payload, {
      onError: (err) => toastError(err.message || 'Hesap oluşturulamadı'),
    })
  }

  return (
    <Dialog open onClose={onClose}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Yeni Kasa/Banka Hesabı</DialogTitle>
          </DialogHeader>
          <DialogContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="siteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="ledger-input h-10 w-full rounded-xl border border-white/80 bg-white/82 px-3 text-sm"
                      >
                        {sites.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tür</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="ledger-input h-10 w-full rounded-xl border border-white/80 bg-white/82 px-3 text-sm"
                      >
                        <option value={CashAccountType.CASH}>Nakit Kasa</option>
                        <option value={CashAccountType.BANK}>Banka Hesabı</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Hesap Adı</FormLabel>
                    <FormControl>
                      <Input placeholder="Örn: Ana Kasa, Ziraat Ticari" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {type === CashAccountType.BANK && (
                <>
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banka Adı</FormLabel>
                        <FormControl>
                          <Input placeholder="Ziraat Bankası" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="iban"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IBAN</FormLabel>
                        <FormControl>
                          <Input placeholder="TR00 0000 0000 0000 0000 0000 00" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Para Birimi</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Kaydediliyor...' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </Dialog>
  )
}

function AccountTransactionsDrawer({
  account,
  onClose,
  onOpenCreate,
}: {
  account: CashAccountRow | null
  onClose: () => void
  onOpenCreate: () => void
}) {
  const [typeFilter, setTypeFilter] = useState<CashTransactionType | ''>('')

  const { data: txRes, isLoading } = useApiQuery<CashTransactionsResponse>(
    ['cash-transactions', { accountId: account?.id, type: typeFilter }],
    `/cash-accounts/${account?.id}/transactions`,
    { limit: 50, type: typeFilter || undefined },
    { enabled: !!account?.id },
  )

  if (!account) return null
  const transactions = txRes?.data ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-[#0c1427]/28 backdrop-blur-sm md:items-stretch">
      <div className="flex h-full w-full flex-col overflow-hidden bg-[#f4f7fb] shadow-[0_24px_54px_rgba(8,17,31,0.18)] md:max-w-[640px]">
        <div className="flex items-center justify-between border-b border-white/70 bg-white/68 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
              {account.type === 'BANK' ? 'Banka Hesabı' : 'Nakit Kasa'}
            </p>
            <p className="text-lg font-semibold text-[#0c1427]">{account.name}</p>
            <p className="text-[11px] text-[#6b7280] mt-0.5">
              Bakiye: <span className={`font-semibold ${Number(account.balance) < 0 ? 'text-[#ba1a1a]' : 'text-[#0c1427]'}`}>{formatTry(Number(account.balance))}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/80 bg-white/72 p-2 text-[#6b7280] hover:bg-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-white/70 bg-white/54 px-5 py-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as CashTransactionType | '')}
            className="ledger-input h-9 rounded-xl border border-white/80 bg-white/82 px-3 text-xs"
          >
            <option value="">Tüm İşlemler</option>
            <option value={CashTransactionType.INCOME}>Gelir</option>
            <option value={CashTransactionType.EXPENSE}>Gider</option>
            <option value={CashTransactionType.TRANSFER}>Transfer</option>
          </select>
          <Button size="sm" onClick={onOpenCreate} className="ml-auto">
            <Plus className="h-4 w-4" />
            Yeni İşlem
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState icon={Wallet} title="Henüz işlem yok" description="Bu hesapta kayıtlı işlem bulunmuyor." />
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const amount = Number(tx.amount)
                const isIncome = tx.type === CashTransactionType.INCOME
                const isExpense = tx.type === CashTransactionType.EXPENSE
                return (
                  <div key={tx.id} className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/72 px-4 py-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isIncome ? 'bg-[#eaf6ee] text-[#14532d]' : isExpense ? 'bg-[#fde8e6] text-[#ba1a1a]' : 'bg-[#eef2f7] text-[#45566d]'}`}>
                      {isIncome ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0c1427] truncate">{tx.description}</p>
                      <p className="text-[11px] text-[#6b7280] mt-0.5">
                        {formatShortDate(tx.transactionDate)}
                        {tx.referenceType ? ` · ${tx.referenceType}` : ''}
                      </p>
                    </div>
                    <p className={`text-sm font-semibold ${isExpense ? 'text-[#ba1a1a]' : 'text-[#14532d]'}`}>
                      {isExpense ? '-' : '+'}{formatTry(amount)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateTransactionModal({
  cashAccountId,
  onClose,
}: {
  cashAccountId: string
  onClose: () => void
}) {
  const form = useForm<CreateCashTransactionDto>({
    resolver: zodResolver(CreateCashTransactionSchema),
    defaultValues: {
      amount: 0,
      type: CashTransactionType.INCOME,
      description: '',
      transactionDate: new Date(),
    },
  })

  const createMutation = useApiMutation<CashTransactionRow, CreateCashTransactionDto>(
    `/cash-accounts/${cashAccountId}/transactions`,
    {
      method: 'POST',
      invalidateKeys: [
        ['cash-transactions', { accountId: cashAccountId }],
        ['cash-accounts'],
      ],
      onSuccess: () => {
        toastSuccess('İşlem kaydedildi')
        onClose()
      },
    },
  )

  const onSubmit = (values: CreateCashTransactionDto) => {
    createMutation.mutate(values, {
      onError: (err) => toastError(err.message || 'İşlem kaydedilemedi'),
    })
  }

  return (
    <Dialog open onClose={onClose}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Yeni İşlem</DialogTitle>
          </DialogHeader>
          <DialogContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tür</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="ledger-input h-10 w-full rounded-xl border border-white/80 bg-white/82 px-3 text-sm"
                      >
                        <option value={CashTransactionType.INCOME}>Gelir</option>
                        <option value={CashTransactionType.EXPENSE}>Gider</option>
                        <option value={CashTransactionType.TRANSFER}>Transfer</option>
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
                        min="0"
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
                name="transactionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İşlem Tarihi</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value instanceof Date ? field.value.toISOString().slice(0, 10) : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
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
                      <Input placeholder="Örn: Asansör bakım faturası" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </Dialog>
  )
}
