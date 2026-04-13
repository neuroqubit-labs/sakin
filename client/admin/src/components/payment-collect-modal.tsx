'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { PaymentMethod } from '@sakin/shared'
import { apiClient } from '@/lib/api'
import {
  formatTry,
  paymentMethodLabel,
} from '@/lib/formatters'
import { UnitDuesSearch, type UnitDuesSearchResult } from '@/components/unit-dues-search'

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

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!searchResult) {
      setSubmitError('Lütfen bir daire ve borç kaydı seçin.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setSubmitError('Geçerli bir tahsilat tutarı girin.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
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
      className="max-w-5xl rounded-2xl bg-[#f7f9fb] p-0 shadow-[0px_20px_45px_rgba(12,20,39,0.22)]"
    >
      <div className="p-5 lg:p-7">
        {/* Header */}
        <div className="mb-6 rounded-xl bg-[#f2f4f6] p-4 lg:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl lg:text-2xl font-black tracking-tight uppercase text-[#0c1427]">{title}</h2>
              <p className="mt-1 text-sm font-medium text-[#4e5d6d]">
                {overview.siteName} · Daire {overview.unitNumber} · {overview.residentName}
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6e7882]">Toplam Borç</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-[#ba1a1a] tabular-nums">{formatTry(remainingDebt)}</p>
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
                <label className="px-1 text-[11px] font-black uppercase tracking-[0.15em] text-[#6e7882]">Ödeme Tutarı</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-[#0c1427]">₺</span>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={amount || ''}
                    onChange={(e) => {
                      setAmount(Number(e.target.value))
                      setAmountTouched(true)
                    }}
                    className="w-full rounded-lg border-0 bg-[#e6e8ea] px-10 py-4 text-2xl font-black text-[#0c1427] outline-none focus:shadow-[inset_0_-1px_0_0_#0c1427]"
                    placeholder="0.00"
                    required
                  />
                  {remainingDebt > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAmount(Number(remainingDebt.toFixed(2)))
                        setAmountTouched(true)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] bg-[#d8f7dd] text-[#006e2d]"
                    >
                      Tam Ödeme
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Method + Date + Receipt */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="px-1 text-[11px] font-black uppercase tracking-[0.15em] text-[#6e7882]">Ödeme Yöntemi</label>
                  <div className="space-y-2">
                    {METHOD_OPTIONS.map((option) => {
                      const active = method === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setMethod(option.value)}
                          className={`w-full rounded-lg px-4 py-3 text-left transition-colors ${
                            active
                              ? 'bg-[#e6e8ea] text-[#0c1427] shadow-[inset_0_0_0_2px_#0c1427]'
                              : 'bg-[#f2f4f6] text-[#4e5d6d] hover:bg-[#e6e8ea]'
                          }`}
                        >
                          <p className="text-sm font-bold">{option.label}</p>
                          <p className="text-[11px] opacity-80 mt-1">{option.hint}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="px-1 text-[11px] font-black uppercase tracking-[0.15em] text-[#6e7882]">İşlem Tarihi</label>
                    <input
                      type="date"
                      value={paidAt}
                      onChange={(e) => setPaidAt(e.target.value)}
                      className="ledger-input w-full bg-[#e6e8ea]"
                    />
                  </div>
                  <div className="rounded-lg bg-[#f2f4f6] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6e7882]">Makbuz Gönderimi</p>
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

              {/* Note */}
              <div className="space-y-2">
                <label className="px-1 text-[11px] font-black uppercase tracking-[0.15em] text-[#6e7882]">Açıklama</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-lg border-0 bg-[#e6e8ea] px-4 py-3 text-sm text-[#0c1427] outline-none resize-none focus:shadow-[inset_0_-1px_0_0_#0c1427]"
                  rows={3}
                  placeholder={sendReceipt ? 'Makbuza yansıyacak not...' : 'İç not ekleyin...'}
                />
              </div>

              {submitError ? <p className="text-sm text-[#ba1a1a]">{submitError}</p> : null}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="col-span-12 lg:col-span-4 space-y-4">
            {/* Selected Dues Info */}
            <div className="rounded-xl bg-[#f2f4f6] p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#0c1427]">Borç Detayı</p>
              {!searchResult ? (
                <p className="mt-3 text-sm text-[#6b7280]">Daire ve borç seçildiğinde detay burada gösterilir.</p>
              ) : (
                <div className="mt-3 space-y-3 text-xs">
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
            <div className="rounded-xl bg-[#f2f4f6] p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#0c1427]">Son Tahsilatlar</p>
              {recentPayments.length === 0 ? (
                <p className="mt-3 text-sm text-[#6b7280]">Geçmiş ödeme kaydı bulunamadı.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {recentPayments.map((payment) => (
                    <div key={payment.id} className="rounded-lg bg-white p-3">
                      <p className="text-xs font-bold text-[#0c1427] tabular-nums">
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
            className="px-6 py-2.5 text-sm font-bold text-[#4e5d6d] hover:text-[#0c1427] transition-colors"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            form="payment-collect-form"
            disabled={submitting || !searchResult}
            className="px-8 py-3 rounded-lg bg-[#006e2d] text-white text-sm font-black uppercase tracking-tight disabled:opacity-60 transition-opacity"
          >
            {submitting ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
