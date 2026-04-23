'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CreditCard, Landmark, ReceiptText, Wallet } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { PaymentMethod } from '@sakin/shared'
import { apiClient } from '@/lib/api'
import {
  formatTry,
  paymentMethodLabel,
} from '@/lib/formatters'
import { UnitDuesSearch, type UnitDuesSearchResult } from '@/components/unit-dues-search'
import { InlineValidation } from '@/components/inline-validation'

type ManualPaymentMethod = PaymentMethod.CASH | PaymentMethod.BANK_TRANSFER | PaymentMethod.POS

interface RecentPayment {
  id: string
  amount: number
  method: string
  paidAt: string | null
  note?: string | null
}

interface PaymentCollectContext {
  unitNumber?: string
  siteName?: string
  residentName?: string
  totalDebt?: number
  recentPayments?: RecentPayment[]
}

interface PaymentCollectModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void | Promise<void>
  onRecorded?: (payload: { amount: number; paidAt: string; unitNumber: string; duesId: string }) => void
  initialDuesId?: string
  initialUnitId?: string
  presetAmount?: number
  title?: string
  context?: PaymentCollectContext
}

function todayForInput(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const METHOD_OPTIONS: Array<{ value: ManualPaymentMethod; label: string; hint: string }> = [
  { value: PaymentMethod.CASH, label: 'Nakit', hint: 'Kasa tahsilatı' },
  { value: PaymentMethod.POS, label: 'POS', hint: 'Fiziksel POS tahsilatı' },
  { value: PaymentMethod.BANK_TRANSFER, label: 'Havale/EFT', hint: 'Banka mutabakatı' },
]

export function PaymentCollectModal({
  open,
  onClose,
  onSuccess,
  onRecorded,
  initialDuesId,
  initialUnitId,
  presetAmount,
  title = 'Ödeme Al',
  context,
}: PaymentCollectModalProps) {
  // Search result from UnitDuesSearch
  const [searchResult, setSearchResult] = useState<UnitDuesSearchResult | null>(null)

  // Form fields
  const [amount, setAmount] = useState<number>(0)
  const [amountTouched, setAmountTouched] = useState(false)
  const [method, setMethod] = useState<ManualPaymentMethod>(PaymentMethod.CASH)
  const [paidAt, setPaidAt] = useState(todayForInput())
  const [sendReceipt, setSendReceipt] = useState(true)
  const [note, setNote] = useState('')

  // Submission state
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ amount?: string; paidAt?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  // Reset on open/close
  useEffect(() => {
    if (!open) return
    setSearchResult(null)
    const startingAmount = presetAmount && presetAmount > 0 ? Number(presetAmount.toFixed(2)) : 0
    setAmount(startingAmount)
    setAmountTouched(startingAmount > 0)
    setMethod(PaymentMethod.CASH)
    setPaidAt(todayForInput())
    setSendReceipt(true)
    setNote('')
    setSubmitError(null)
    setSubmitSuccess(null)
    setFieldErrors({})
  }, [open, presetAmount])

  // When UnitDuesSearch selects a dues
  const handleDuesSelected = (result: UnitDuesSearchResult) => {
    setSearchResult(result)
    if (!amountTouched && result.remainingAmount > 0) {
      setAmount(Number(result.remainingAmount.toFixed(2)))
    }
  }

  const remainingDebt = useMemo(() => {
    if (searchResult) return searchResult.remainingAmount
    return context?.totalDebt ?? 0
  }, [searchResult, context?.totalDebt])

  const overview = useMemo(() => {
    const unitNumber = searchResult?.unitNumber ?? context?.unitNumber ?? '-'
    const siteName = searchResult?.siteName ?? context?.siteName ?? 'Bina'
    const residentName = searchResult?.residentName ?? context?.residentName ?? 'Sakin'
    return { unitNumber, siteName, residentName }
  }, [searchResult, context])

  const recentPayments = useMemo(() => {
    return (context?.recentPayments ?? []).slice(0, 3)
  }, [context?.recentPayments])

  const MethodIcon =
    method === PaymentMethod.CASH
      ? Wallet
      : method === PaymentMethod.POS
        ? CreditCard
        : Landmark

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors: { amount?: string; paidAt?: string } = {}
    if (!searchResult) {
      setSubmitError('Lütfen bir daire ve borç kaydı seçin.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.amount = "Tahsilat tutarı 0'dan büyük olmalı."
    }
    if (searchResult.remainingAmount > 0 && amount - searchResult.remainingAmount > 0.001) {
      nextErrors.amount = 'Tahsilat tutarı kalan borcu aşamaz.'
    }
    if (!paidAt) {
      nextErrors.paidAt = 'İşlem tarihi zorunludur.'
    }
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setSubmitError('Lütfen formdaki hataları düzeltin.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)
    try {
      await apiClient('/payments/manual-collection', {
        method: 'POST',
        body: JSON.stringify({
          unitId: searchResult.unitId,
          duesId: searchResult.duesId,
          amount: Number(amount),
          method,
          note: note.trim() || undefined,
          paidAt: paidAt || undefined,
        }),
      })
      onRecorded?.({
        amount: Number(amount),
        paidAt: paidAt || new Date().toISOString(),
        unitNumber: searchResult.unitNumber,
        duesId: searchResult.duesId,
      })
      setSubmitSuccess('Tahsilat kaydı oluşturuldu. Liste doğrulanıyor...')
      await onSuccess?.()
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Ödeme kaydı oluşturulamadı')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (submitting) return
        onClose()
      }}
      className="max-w-5xl rounded-[30px] border border-white/75 bg-[rgba(247,251,255,0.84)] p-0 shadow-[0_30px_80px_rgba(8,17,31,0.18)] backdrop-blur-2xl"
    >
      <div className="p-5 lg:p-7">
        {/* Header */}
        <div className="ledger-panel mb-6 overflow-hidden p-4 lg:p-5">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(79,125,247,0.22),transparent_55%)]" />
          <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="ledger-label mb-3 inline-flex rounded-full border border-white/80 bg-white/72 px-3 py-1">Tahsilat Akışı</p>
              <h2 className="text-[1.7rem] font-semibold tracking-[-0.05em] text-[#0d182b] lg:text-[2rem]">{title}</h2>
              <p className="mt-2 text-sm font-medium text-[#5c6f86]">
                {overview.siteName} · Daire {overview.unitNumber} · {overview.residentName}
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#71829a]">Toplam Borç</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#ba1a1a] tabular-nums">{formatTry(remainingDebt)}</p>
            </div>
          </div>
        </div>

        <form id="payment-collect-form" onSubmit={submitPayment} className="grid grid-cols-12 gap-6 lg:gap-8">
          <section className="col-span-12 lg:col-span-8">
            <div className="ledger-panel p-6 lg:p-7 space-y-6">
              {/* Unit & Dues Search — replaces UUID input */}
              <UnitDuesSearch
                onSelect={handleDuesSelected}
                initialDuesId={initialDuesId}
                initialUnitId={initialUnitId}
                siteId={undefined}
              />

              {/* Amount */}
              <div className="space-y-2">
                <label className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#71829a]">Ödeme Tutarı</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-[#0c1427]">₺</span>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={amount || ''}
                    onChange={(e) => {
                      setAmount(Number(e.target.value))
                      setAmountTouched(true)
                    }}
                    className="w-full rounded-2xl border border-white/85 bg-white/82 px-10 py-4 text-2xl font-semibold text-[#0c1427] shadow-[0_14px_32px_rgba(8,17,31,0.06)] outline-none transition-all focus:border-[#6d8ef8] focus:shadow-[0_0_0_4px_rgba(79,125,247,0.12),0_16px_32px_rgba(79,125,247,0.12)]"
                    placeholder="0.00"
                    required
                  />
                  <InlineValidation message={fieldErrors.amount} tone="error" />
                  {remainingDebt > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAmount(Number(remainingDebt.toFixed(2)))
                        setAmountTouched(true)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-[#caedd4] bg-[#edf9f1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#006e2d]"
                    >
                      Tam Ödeme
                    </button>
                  ) : null}
                  {!fieldErrors.amount && remainingDebt > 0 ? (
                    <InlineValidation
                      message={`Kalan borç: ${formatTry(remainingDebt)} — tek işlemde en fazla bu tutar alınabilir.`}
                    />
                  ) : null}
                </div>
              </div>

              {/* Method + Date + Receipt */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#71829a]">Ödeme Yöntemi</label>
                  <div className="space-y-2">
                    {METHOD_OPTIONS.map((option) => {
                      const active = method === option.value
                      const OptionIcon =
                        option.value === PaymentMethod.CASH
                          ? Wallet
                          : option.value === PaymentMethod.POS
                            ? CreditCard
                            : Landmark
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setMethod(option.value)}
                          className={`w-full rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
                            active
                              ? 'border border-white/85 bg-[linear-gradient(135deg,rgba(79,125,247,0.16),rgba(59,209,255,0.08))] text-[#0c1427] shadow-[0_14px_32px_rgba(79,125,247,0.12)]'
                              : 'border border-white/80 bg-[#f7faff] text-[#4e5d6d] hover:bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                              active
                                ? 'bg-[linear-gradient(135deg,#17345a,#4f7df7)] text-white'
                                : 'bg-white text-[#6d7f96]'
                            }`}>
                              <OptionIcon className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-sm font-semibold">{option.label}</p>
                              <p className="mt-1 text-[11px] opacity-80">{option.hint}</p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#71829a]">İşlem Tarihi</label>
                    <input
                      type="date"
                      value={paidAt}
                      onChange={(e) => setPaidAt(e.target.value)}
                      className="ledger-input w-full bg-[#e6e8ea]"
                    />
                    <InlineValidation message={fieldErrors.paidAt} tone="error" />
                  </div>
                  <div className="rounded-[22px] border border-white/80 bg-[#f7faff] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#17345a,#4f7df7)] text-white">
                        <ReceiptText className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#71829a]">Makbuz Gönderimi</p>
                        <label className="mt-2 flex items-center gap-2 text-xs text-[#4e5d6d] font-medium">
                          <input
                            type="checkbox"
                            checked={sendReceipt}
                            onChange={(e) => setSendReceipt(e.target.checked)}
                            className="h-4 w-4 rounded border-[#c5c6cd]"
                          />
                          E-posta ile makbuz gönder
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <label className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#71829a]">Açıklama</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full resize-none rounded-2xl border border-white/85 bg-white/82 px-4 py-3 text-sm text-[#0c1427] shadow-[0_12px_28px_rgba(8,17,31,0.05)] outline-none transition-all focus:border-[#6d8ef8] focus:shadow-[0_0_0_4px_rgba(79,125,247,0.12),0_16px_32px_rgba(79,125,247,0.12)]"
                  rows={3}
                  placeholder={sendReceipt ? 'Makbuza yansıyacak not...' : 'İç not ekleyin...'}
                />
              </div>

              {submitError ? <p className="text-sm text-[#ba1a1a]">{submitError}</p> : null}
              {submitSuccess ? <InlineValidation message={submitSuccess} tone="success" /> : null}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="col-span-12 lg:col-span-4 space-y-4">
            {/* Selected Dues Info */}
            <div className="ledger-panel p-5">
              <div className="relative z-10 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#17345a,#4f7df7)] text-white">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#71829a]">Borç Detayı</p>
                  <p className="mt-1 text-sm font-semibold text-[#102038]">Seçilen kayıt özeti</p>
                </div>
              </div>
              {!searchResult ? (
                <p className="mt-4 text-sm text-[#6b7280]">Daire ve borç seçildiğinde detay burada gösterilir.</p>
              ) : (
                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#4e5d6d]">{searchResult.periodMonth}/{searchResult.periodYear} Aidatı</span>
                    <strong className="text-[#0c1427] tabular-nums">{formatTry(searchResult.amount)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#4e5d6d]">Tahsil Edilen</span>
                    <strong className="text-[#006e2d] tabular-nums">{formatTry(searchResult.paidAmount)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#4e5d6d]">Kalan Bakiye</span>
                    <strong className="text-[#ba1a1a] tabular-nums">{formatTry(searchResult.remainingAmount)}</strong>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[#4e5d6d]">Vade</span>
                    <strong className="text-[#0c1427]">{new Date(searchResult.dueDate).toLocaleDateString('tr-TR')}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Payments */}
            <div className="ledger-panel p-5">
              <div className="relative z-10 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#17345a,#4f7df7)] text-white">
                  <MethodIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#71829a]">Son Tahsilatlar</p>
                  <p className="mt-1 text-sm font-semibold text-[#102038]">{paymentMethodLabel(method)} akışı</p>
                </div>
              </div>
              {recentPayments.length === 0 ? (
                <p className="mt-4 text-sm text-[#6b7280]">Geçmiş ödeme kaydı bulunamadı.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {recentPayments.map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-white/80 bg-white/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                      <p className="text-xs font-semibold text-[#0c1427] tabular-nums">
                        {formatTry(payment.amount)} · {paymentMethodLabel(payment.method)}
                      </p>
                      <p className="text-[11px] text-[#6b7280] mt-1">
                        {payment.paidAt ? new Date(payment.paidAt).toLocaleString('tr-TR') : '-'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </form>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border border-white/80 bg-white/78 px-6 py-2.5 text-sm font-semibold text-[#4e5d6d] shadow-[0_10px_24px_rgba(8,17,31,0.05)] transition-colors hover:text-[#0c1427]"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            form="payment-collect-form"
            disabled={submitting || !searchResult}
            className="rounded-2xl border border-[#17345a]/12 bg-[linear-gradient(135deg,#12203a_0%,#1d3b67_46%,#4f7df7_100%)] px-8 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-[0_18px_34px_rgba(79,125,247,0.24)] transition-all disabled:opacity-60"
          >
            {submitting ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
