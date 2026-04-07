'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { StaffPageHeader, StaffStatusPill } from '@/components/staff-surface'
import { PaymentCollectModal } from '@/components/payment-collect-modal'
import {
  duesStatusLabel,
  duesStatusTone,
  formatDateTime,
  formatShortDate,
  formatTry,
  paymentMethodLabel,
} from '@/lib/work-presenters'

interface UnitDetail {
  id: string
  number: string
  floor: number | null
  type: string
  area: number | null
  site: { name: string; city: string }
  block: { name: string } | null
  residents: Array<{
    id: string
    firstName: string
    lastName: string
    phoneNumber: string
    type: string
  }>
  dues: Array<{
    id: string
    periodMonth: number
    periodYear: number
    amount: string | number
    paidAmount: string | number
    status: string
    dueDate: string
    payments?: Array<{
      id: string
      amount: string | number
      method: string
      paidAt: string | null
      note?: string | null
    }>
  }>
}

interface LedgerRow {
  id: string
  date: Date | null
  type: 'CHARGE' | 'PAYMENT'
  title: string
  subtitle: string
  charge: number
  payment: number
  status: string
}

function toNumber(v: string | number) {
  return typeof v === 'string' ? Number(v) : v
}

interface AuditLogEntry {
  id: string
  action: string
  entity: string
  entityId: string
  changes: Record<string, unknown> | null
  performedBy: string
  createdAt: string
}

const ACTION_LABELS: Record<string, string> = {
  'payment.manual.confirmed': 'Nakit/POS Tahsilat',
  'payment.bank_transfer.confirmed': 'Banka Transferi Onaylandı',
  'payment.bank_transfer.rejected': 'Transfer Reddedildi',
}

export default function WorkUnitDetailPage() {
  const params = useParams<{ id: string }>()
  const unitId = params?.id
  const [unit, setUnit] = useState<UnitDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openPaymentModal, setOpenPaymentModal] = useState(false)
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])

  const loadUnitDetail = useCallback(async () => {
    if (!unitId) return
    setLoading(true)
    setError(null)
    try {
      const [unitResponse, auditResponse] = await Promise.all([
        apiClient<UnitDetail>(`/units/${unitId}`),
        apiClient<AuditLogEntry[]>(`/ledger/unit-audit-log?unitId=${unitId}&limit=10`).catch(() => []),
      ])
      setUnit(unitResponse)
      setAuditLog(auditResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Daire detayı alınamadı')
    } finally {
      setLoading(false)
    }
  }, [unitId])

  useEffect(() => {
    void loadUnitDetail()
  }, [loadUnitDetail])

  const totals = useMemo(() => {
    const duesRows = unit?.dues ?? []
    const totalAmount = duesRows.reduce((sum, dues) => sum + toNumber(dues.amount), 0)
    const totalPaid = duesRows.reduce((sum, dues) => sum + toNumber(dues.paidAmount), 0)
    const totalDebt = Math.max(0, totalAmount - totalPaid)
    return { totalAmount, totalPaid, totalDebt }
  }, [unit])

  const ledger = useMemo(() => {
    if (!unit) return [] as Array<LedgerRow & { balance: number }>

    const rows: LedgerRow[] = []
    for (const dues of unit.dues) {
      rows.push({
        id: `charge-${dues.id}`,
        date: dues.dueDate ? new Date(dues.dueDate) : null,
        type: 'CHARGE',
        title: `${dues.periodMonth}/${dues.periodYear} Aidatı`,
        subtitle: 'Dönemsel tahakkuk',
        charge: toNumber(dues.amount),
        payment: 0,
        status: dues.status,
      })
      for (const payment of dues.payments ?? []) {
        rows.push({
          id: `payment-${payment.id}`,
          date: payment.paidAt ? new Date(payment.paidAt) : null,
          type: 'PAYMENT',
          title: paymentMethodLabel(payment.method),
          subtitle: payment.note ?? 'Tahsilat kaydı',
          charge: 0,
          payment: toNumber(payment.amount),
          status: 'CONFIRMED',
        })
      }
    }

    rows.sort((a, b) => {
      const av = a.date?.getTime() ?? 0
      const bv = b.date?.getTime() ?? 0
      return av - bv
    })

    let balance = 0
    const withBalance = rows.map((row) => {
      balance += row.charge
      balance -= row.payment
      return { ...row, balance }
    })

    return withBalance.reverse()
  }, [unit])

  const preferredDuesId = useMemo(() => {
    if (!unit?.dues.length) return undefined
    const unpaid = unit.dues.find((dues) => Math.max(0, toNumber(dues.amount) - toNumber(dues.paidAmount)) > 0)
    return (unpaid ?? unit.dues[0])?.id
  }, [unit])

  const preferredDuesRemaining = useMemo(() => {
    if (!unit?.dues.length || !preferredDuesId) return undefined
    const dues = unit.dues.find((item) => item.id === preferredDuesId)
    if (!dues) return undefined
    return Math.max(0, toNumber(dues.amount) - toNumber(dues.paidAmount))
  }, [preferredDuesId, unit])

  const recentPayments = useMemo(() => {
    if (!unit?.dues.length) return []
    return unit.dues
      .flatMap((dues) => dues.payments ?? [])
      .sort((a, b) => new Date(b.paidAt ?? 0).getTime() - new Date(a.paidAt ?? 0).getTime())
      .slice(0, 4)
      .map((payment) => ({
        id: payment.id,
        amount: toNumber(payment.amount),
        method: payment.method,
        paidAt: payment.paidAt,
        note: payment.note ?? undefined,
      }))
  }, [unit])

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title={`${unit?.site.name ?? 'Daire'} · Daire ${unit?.number ?? ''}`}
        subtitle="Sakin profili, bakiye özeti ve finansal hareket geçmişi."
        actions={(
          <>
            <Link href="/work/units" className="px-3 py-2 rounded-md bg-[#e6e8ea] text-xs font-semibold text-[#0c1427]">
              Listeye Dön
            </Link>
            <button
              type="button"
              onClick={() => setOpenPaymentModal(true)}
              className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white"
            >
              Ödeme Al
            </button>
          </>
        )}
      />

      {loading && <p className="text-sm text-[#6b7280]">Yükleniyor...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {unit && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <div className="ledger-panel p-5">
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#5f6a75]">Sakin Bilgisi</p>
              <div className="mt-3 space-y-3">
                {unit.residents.length === 0 && <p className="text-sm text-[#6b7280]">Aktif sakin kaydı yok.</p>}
                {unit.residents.map((resident) => (
                  <div key={resident.id} className="rounded-lg bg-[#f2f4f6] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0c1427]">{resident.firstName} {resident.lastName}</p>
                      <StaffStatusPill label={resident.type} tone="neutral" />
                    </div>
                    <p className="text-xs text-[#6b7280] mt-2">{resident.phoneNumber}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="ledger-panel p-5">
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#5f6a75]">Mülk Detayı</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-md bg-[#f2f4f6] p-2">
                  <p className="text-[10px] text-[#6b7280] uppercase">Tip</p>
                  <p className="text-sm font-semibold text-[#0c1427]">{unit.type}</p>
                </div>
                <div className="rounded-md bg-[#f2f4f6] p-2">
                  <p className="text-[10px] text-[#6b7280] uppercase">Kat</p>
                  <p className="text-sm font-semibold text-[#0c1427]">{unit.floor ?? '-'}</p>
                </div>
                <div className="rounded-md bg-[#f2f4f6] p-2">
                  <p className="text-[10px] text-[#6b7280] uppercase">Blok</p>
                  <p className="text-sm font-semibold text-[#0c1427]">{unit.block?.name ?? 'Bloksuz'}</p>
                </div>
                <div className="rounded-md bg-[#f2f4f6] p-2">
                  <p className="text-[10px] text-[#6b7280] uppercase">Alan</p>
                  <p className="text-sm font-semibold text-[#0c1427]">{unit.area ? `${unit.area} m²` : '-'}</p>
                </div>
              </div>
            </div>

            <div className="ledger-panel p-5">
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#5f6a75]">Ödeme Performansı</p>
              <p className="text-2xl font-black text-[#0c1427] tabular-nums mt-2">
                %{totals.totalAmount > 0 ? Math.round((totals.totalPaid / totals.totalAmount) * 100) : 0}
              </p>
              <p className="text-xs text-[#6b7280] mt-1">Toplam tahakkuk üzerinden</p>
              <div className="ledger-kpi-rail">
                <span className="bg-[#006e2d]" style={{ width: `${totals.totalAmount > 0 ? Math.round((totals.totalPaid / totals.totalAmount) * 100) : 0}%` }} />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden ledger-gradient rounded-2xl p-8 text-white flex flex-col md:flex-row justify-between gap-4 items-center">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-75">Güncel Toplam Bakiye</p>
              <p className="text-5xl md:text-6xl font-black tabular-nums mt-2">{formatTry(totals.totalDebt)}</p>
              <p className="text-sm mt-2 opacity-90">Ödeme yapılmamış veya kısmi ödenmiş kalemler dahil.</p>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setOpenPaymentModal(true)}
                className="px-6 py-3 rounded-lg bg-white text-[#0c1427] text-xs font-bold text-center"
              >
                Şimdi Ödeme Al
              </button>
              <button type="button" className="px-6 py-3 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-bold">
                Ekstre Gönder
              </button>
            </div>
          </div>

          <div className="ledger-panel overflow-hidden">
            <div className="px-5 py-4 bg-[#f2f4f6] flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Cari Hareket Kayıtları (Ledger)</h2>
              <div className="flex items-center gap-2">
                <button type="button" className="px-3 py-1.5 rounded-md bg-white text-xs font-semibold text-[#0c1427]">Filtre</button>
                <button type="button" className="px-3 py-1.5 rounded-md bg-white text-xs font-semibold text-[#0c1427]">Dışa Aktar</button>
              </div>
            </div>

            <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
              <span className="col-span-2">İşlem Tarihi</span>
              <span className="col-span-3">Tür / Açıklama</span>
              <span className="col-span-2 text-right">Borç (+)</span>
              <span className="col-span-2 text-right">Ödeme (-)</span>
              <span className="col-span-2 text-right">Bakiye</span>
              <span className="col-span-1 text-center">Durum</span>
            </div>

            <div className="ledger-divider">
              {ledger.map((row) => (
                <div key={row.id} className="grid grid-cols-12 px-5 py-3 items-center ledger-table-row-hover">
                  <p className="col-span-2 text-xs text-[#5f6a75]">{formatDateTime(row.date)}</p>
                  <div className="col-span-3">
                    <p className="text-sm font-semibold text-[#0c1427]">{row.title}</p>
                    <p className="text-[11px] text-[#6b7280]">{row.subtitle}</p>
                  </div>
                  <p className="col-span-2 text-right text-sm tabular-nums font-bold text-[#ba1a1a]">
                    {row.charge > 0 ? formatTry(row.charge) : '—'}
                  </p>
                  <p className="col-span-2 text-right text-sm tabular-nums font-bold text-[#006e2d]">
                    {row.payment > 0 ? formatTry(row.payment) : '—'}
                  </p>
                  <p className="col-span-2 text-right text-sm tabular-nums font-bold text-[#0c1427]">{formatTry(row.balance)}</p>
                  <div className="col-span-1 flex justify-center">
                    <StaffStatusPill
                      label={row.type === 'PAYMENT' ? 'Onaylandı' : duesStatusLabel(row.status)}
                      tone={row.type === 'PAYMENT' ? 'success' : duesStatusTone(row.status)}
                    />
                  </div>
                </div>
              ))}
              {ledger.length === 0 && <p className="px-5 py-6 text-sm text-[#6b7280]">Hareket kaydı bulunmuyor.</p>}
            </div>
          </div>

          {auditLog.length > 0 && (
            <div className="ledger-panel overflow-hidden">
              <div className="px-5 py-4 bg-[#f2f4f6]">
                <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">İşlem Denetim Kaydı</h2>
              </div>
              <div className="ledger-divider">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="px-5 py-3 flex items-start justify-between gap-4 ledger-table-row-hover">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0c1427]">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </p>
                      <p className="text-xs text-[#6b7280] mt-0.5">{entry.performedBy}</p>
                    </div>
                    <p className="text-xs text-[#6b7280] shrink-0">{formatDateTime(entry.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-[#6b7280]">
            Son güncelleme: {formatShortDate(new Date())}
          </div>
        </>
      )}

      <PaymentCollectModal
        open={openPaymentModal}
        onClose={() => setOpenPaymentModal(false)}
        onSuccess={async () => {
          await loadUnitDetail()
        }}
        initialDuesId={preferredDuesId}
        presetAmount={preferredDuesRemaining}
        context={
          unit
            ? {
                siteName: unit.site.name,
                unitNumber: unit.number,
                residentName: unit.residents[0] ? `${unit.residents[0].firstName} ${unit.residents[0].lastName}` : undefined,
                totalDebt: totals.totalDebt,
                recentPayments,
              }
            : undefined
        }
      />
    </div>
  )
}
