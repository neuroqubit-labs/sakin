'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api'
import { useSiteContext } from '@/providers/site-provider'
import {
  duesStatusLabel,
  duesStatusTone,
  formatDateTime,
  formatShortDate,
  formatTry,
  paymentMethodLabel,
} from '@/lib/work-presenters'
import { workQuery } from '@/lib/work-query'
import { StaffKpiCard, StaffPageHeader, StaffSectionTitle, StaffStatusPill } from '@/components/staff-surface'
import { PaymentCollectModal } from '@/components/payment-collect-modal'

interface WorkSummaryResponse {
  kpi: {
    totalDebt: number
    thisMonthCollection: number
    overdueCount: number
    overdueDebt: number
    collectionRate: number
  }
  debtors: Array<{
    id: string
    duesId: string
    unitNumber: string
    siteName: string
    amount: number
    paidAmount: number
    remainingAmount: number
    dueDate: string
    status: string
    residentName: string | null
    residentType: string | null
    overdueDays: number
    priorityScore: number
  }>
  recentPayments: Array<{
    id: string
    amount: number
    paidAt: string | null
    method: string
    duesId: string
    unitNumber: string
    siteName: string
    residentName: string | null
  }>
  alerts: {
    highPriorityDebtors: number
    openDebtItems: number
  }
}

export default function WorkQueuePage() {
  const { selectedSiteId, hydrated, error: siteError } = useSiteContext()
  const [summary, setSummary] = useState<WorkSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quickPayTarget, setQuickPayTarget] = useState<WorkSummaryResponse['debtors'][number] | null>(null)

  const loadSummary = async () => {
    if (!hydrated || !selectedSiteId) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient<WorkSummaryResponse>('/tenant/work-summary', {
        params: workQuery({ siteId: selectedSiteId }),
      })
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action center verisi alınamadı')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hydrated && !selectedSiteId) {
      setLoading(false)
      return
    }
    void loadSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, hydrated])

  function openQuickPay(target: WorkSummaryResponse['debtors'][number]) {
    setQuickPayTarget(target)
  }

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Dashboard Action Center"
        subtitle="Borç önceliğini yönetin, hızlı tahsilatla nakit akışını canlı tutun."
        actions={(
          <>
            <Link href="/work/payments" className="px-3 py-2 rounded-md bg-[#e6e8ea] text-xs font-semibold text-[#0c1427]">
              Work Odemeler
            </Link>
            <Link href="/work/residents" className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white">
              Work Sakinler
            </Link>
          </>
        )}
      />

      {loading && <p className="text-sm text-[#6b7280]">Yükleniyor...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !summary && !error && (
        <div className="ledger-panel p-5">
          <p className="text-sm text-[#6b7280]">
            {siteError
              ? `Site verisi alınamadı: ${siteError}`
              : 'Aktif bina seçimi bulunamadı. Üst bardan bir bina seçerek devam edin.'}
          </p>
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <StaffKpiCard
              label="Toplam Borç"
              value={<span className="text-[#ba1a1a]">{formatTry(summary.kpi.totalDebt)}</span>}
              hint={`${summary.alerts.openDebtItems} açık borç kalemi`}
              railPercent={Math.min(100, Math.round((summary.kpi.totalDebt / Math.max(summary.kpi.totalDebt + summary.kpi.thisMonthCollection, 1)) * 100))}
              railClassName="bg-[#ba1a1a]"
            />
            <StaffKpiCard
              label="Bu Ay Tahsilat"
              value={<span className="text-[#006e2d]">{formatTry(summary.kpi.thisMonthCollection)}</span>}
              hint={`Tahsilat oranı %${summary.kpi.collectionRate}`}
              railPercent={summary.kpi.collectionRate}
              railClassName="bg-[#006e2d]"
            />
            <StaffKpiCard
              label="Gecikmiş Borç"
              value={<span className="text-[#ba1a1a]">{formatTry(summary.kpi.overdueDebt)}</span>}
              hint={`${summary.kpi.overdueCount} daire gecikmede`}
              railPercent={Math.min(100, summary.kpi.overdueCount * 8)}
              railClassName="bg-[#ba1a1a]"
            />
            <StaffKpiCard
              label="Tahsilat Oranı"
              value={`%${summary.kpi.collectionRate}`}
              hint="Açık bakiyeye göre"
              railPercent={summary.kpi.collectionRate}
              railClassName="bg-[#0c1427]"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
            <div className="xl:col-span-8 ledger-panel overflow-hidden">
              <StaffSectionTitle
                title="Gecikmiş ve Bekleyen Ödemeler"
                subtitle={`${summary.debtors.length} daire öncelik sırasına göre listeleniyor`}
              />
              <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
                <span className="col-span-2">Daire</span>
                <span className="col-span-3">Sakin</span>
                <span className="col-span-2 text-right">Kalan Borç</span>
                <span className="col-span-2">Vade/Durum</span>
                <span className="col-span-1 text-center">Öncelik</span>
                <span className="col-span-2 text-right">Aksiyon</span>
              </div>
              <div className="ledger-divider">
                {summary.debtors.length === 0 && (
                  <p className="px-5 py-6 text-sm text-[#6b7280]">Açık borçlu daire bulunamadı.</p>
                )}
                {summary.debtors.map((debtor) => (
                  <div key={debtor.id} className="grid grid-cols-12 px-5 py-3 items-center ledger-table-row-hover">
                    <div className="col-span-2">
                      <p className="text-sm font-semibold text-[#0c1427]">{debtor.unitNumber}</p>
                      <p className="text-[11px] text-[#6b7280]">{debtor.siteName}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-[#0f172a]">{debtor.residentName ?? 'Sakin atanmamış'}</p>
                      <p className="text-[11px] text-[#6b7280]">{debtor.residentType ?? 'Tip yok'}</p>
                    </div>
                    <p className="col-span-2 text-right text-sm font-bold tabular-nums text-[#0c1427]">{formatTry(debtor.remainingAmount)}</p>
                    <div className="col-span-2 space-y-1">
                      <p className="text-[11px] text-[#6b7280]">{formatShortDate(debtor.dueDate)}</p>
                      <StaffStatusPill label={duesStatusLabel(debtor.status)} tone={duesStatusTone(debtor.status)} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <span className={`ledger-chip ${debtor.priorityScore >= 70 ? 'ledger-chip-danger' : debtor.priorityScore >= 40 ? 'ledger-chip-warning' : 'ledger-chip-neutral'}`}>
                        {debtor.priorityScore}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <button
                        type="button"
                        onClick={() => openQuickPay(debtor)}
                        className="px-3 py-1.5 rounded-md ledger-gradient text-white text-xs font-bold"
                      >
                        Tahsil Et
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="xl:col-span-4 space-y-3">
              <div className="ledger-gradient rounded-xl p-5 text-white">
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold opacity-70">Kritik Uyarı</p>
                <p className="text-sm font-semibold mt-2">{summary.alerts.highPriorityDebtors} yüksek öncelikli borçlu daire var.</p>
                <p className="text-xs opacity-80 mt-2">
                  Ortalama gecikme süresi {Math.round(
                    summary.debtors.reduce((sum, d) => sum + d.overdueDays, 0) / Math.max(summary.debtors.length, 1),
                  )} gün.
                </p>
              </div>

              <div className="ledger-panel overflow-hidden">
                <StaffSectionTitle title="Son Tahsilatlar" />
                <div className="ledger-divider">
                  {summary.recentPayments.length === 0 && (
                    <p className="px-5 py-6 text-sm text-[#6b7280]">Kayıt bulunamadı.</p>
                  )}
                  {summary.recentPayments.map((payment) => (
                    <div key={payment.id} className="px-5 py-3 ledger-table-row-hover">
                      <p className="text-sm font-semibold text-[#0c1427]">
                        {payment.siteName} · Daire {payment.unitNumber}
                      </p>
                      <p className="text-[11px] text-[#6b7280] mt-1">
                        {payment.residentName ?? 'Sakin'} · {paymentMethodLabel(payment.method)} · {formatTry(payment.amount)}
                      </p>
                      <p className="text-[11px] text-[#7b8795] mt-1">{formatDateTime(payment.paidAt)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ledger-panel-soft p-4">
                <p className="text-xs font-bold tracking-[0.14em] uppercase text-[#4b5968]">Bugünkü Görevler</p>
                <ul className="mt-3 space-y-2 text-sm text-[#0c1427]">
                  <li>- Gecikmesi 10 günü geçen dairelere hatırlatma</li>
                  <li>- Tahsilat girişi bekleyen banka transferlerini kontrol et</li>
                  <li>- Dönem sonu aidat raporunu dışa aktar</li>
                </ul>
              </div>
            </div>
          </div>

          <PaymentCollectModal
            open={Boolean(quickPayTarget)}
            onClose={() => setQuickPayTarget(null)}
            onSuccess={async () => {
              setQuickPayTarget(null)
              await loadSummary()
            }}
            title="Hızlı Tahsilat"
            initialDuesId={quickPayTarget?.duesId}
            presetAmount={quickPayTarget?.remainingAmount}
            context={
              quickPayTarget
                ? {
                    siteName: quickPayTarget.siteName,
                    unitNumber: quickPayTarget.unitNumber,
                    residentName: quickPayTarget.residentName ?? undefined,
                    totalDebt: quickPayTarget.remainingAmount,
                    recentPayments: summary?.recentPayments.map((payment) => ({
                      id: payment.id,
                      amount: payment.amount,
                      method: payment.method,
                      paidAt: payment.paidAt,
                      note: undefined,
                    })),
                  }
                : undefined
            }
          />
        </>
      )}
    </div>
  )
}
