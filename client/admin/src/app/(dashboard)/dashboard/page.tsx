'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api'
import { useSiteContext } from '@/providers/site-provider'
import { StaffKpiCard, StaffPageHeader, StaffStatusPill } from '@/components/staff-surface'
import { duesStatusLabel, duesStatusTone, formatShortDate, formatTry, paymentMethodLabel } from '@/lib/work-presenters'
import { workQuery } from '@/lib/work-query'
import { DuesStatus } from '@sakin/shared'

interface WorkSummaryResponse {
  kpi: {
    totalDebt: number
    thisMonthCollection: number
    overdueCount: number
    overdueDebt: number
    collectionRate: number
  }
  alerts: {
    highPriorityDebtors: number
    openDebtItems: number
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
    status: DuesStatus
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
    duesId: string | null
    unitNumber: string
    siteName: string
    residentName: string | null
  }>
}

interface PortfolioResponse {
  id: string
  name: string
  totalUnits: number
  city: string
  occupancyRate: number
  totalDebt: number
  collectionRate: number
  thisMonthCollection: number
  overdueUnits: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

interface ReconciliationSummary {
  totals: {
    confirmedAmount: number
  }
}

interface TrendWindow {
  current: number
  previous: number
}

function trendDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export default function DashboardPage() {
  const { selectedSiteId, setSelectedSiteId, availableSites, hydrated, error: siteError } = useSiteContext()
  const [summary, setSummary] = useState<WorkSummaryResponse | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioResponse[]>([])
  const [weeklyTrend, setWeeklyTrend] = useState<TrendWindow>({ current: 0, previous: 0 })
  const [monthlyTrend, setMonthlyTrend] = useState<TrendWindow>({ current: 0, previous: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hydrated) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - 7)
        const prevWeekStart = new Date(now)
        prevWeekStart.setDate(now.getDate() - 14)
        const prevWeekEnd = new Date(now)
        prevWeekEnd.setDate(now.getDate() - 7)

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)

        const [summaryData, portfolioData, weekCurrent, weekPrev, monthCurrent, monthPrev] = await Promise.all([
          apiClient<WorkSummaryResponse>('/tenant/work-summary', {
            params: workQuery({ siteId: selectedSiteId ?? undefined }),
          }),
          apiClient<PortfolioResponse[]>('/tenant/work-portfolio'),
          apiClient<ReconciliationSummary>('/payments/reconciliation-summary', {
            params: workQuery({
              siteId: selectedSiteId ?? undefined,
              dateFrom: weekStart.toISOString(),
              dateTo: now.toISOString(),
            }),
          }),
          apiClient<ReconciliationSummary>('/payments/reconciliation-summary', {
            params: workQuery({
              siteId: selectedSiteId ?? undefined,
              dateFrom: prevWeekStart.toISOString(),
              dateTo: prevWeekEnd.toISOString(),
            }),
          }),
          apiClient<ReconciliationSummary>('/payments/reconciliation-summary', {
            params: workQuery({
              siteId: selectedSiteId ?? undefined,
              dateFrom: monthStart.toISOString(),
              dateTo: now.toISOString(),
            }),
          }),
          apiClient<ReconciliationSummary>('/payments/reconciliation-summary', {
            params: workQuery({
              siteId: selectedSiteId ?? undefined,
              dateFrom: prevMonthStart.toISOString(),
              dateTo: prevMonthEnd.toISOString(),
            }),
          }),
        ])
        setSummary(summaryData)
        setPortfolio(portfolioData)
        setWeeklyTrend({
          current: weekCurrent.totals.confirmedAmount,
          previous: weekPrev.totals.confirmedAmount,
        })
        setMonthlyTrend({
          current: monthCurrent.totals.confirmedAmount,
          previous: monthPrev.totals.confirmedAmount,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Veri yüklenemedi')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [hydrated, selectedSiteId])

  if (siteError) {
    return <p className="text-sm text-red-600">{siteError}</p>
  }

  const portfolioHighRisk = useMemo(
    () => portfolio.filter((site) => site.riskLevel === 'HIGH'),
    [portfolio],
  )
  const portfolioMediumRisk = useMemo(
    () => portfolio.filter((site) => site.riskLevel === 'MEDIUM'),
    [portfolio],
  )
  const topDebtors = useMemo(
    () => (summary?.debtors ?? []).slice().sort((a, b) => b.remainingAmount - a.remainingAmount).slice(0, 6),
    [summary],
  )
  const weeklyDelta = trendDelta(weeklyTrend.current, weeklyTrend.previous)
  const monthlyDelta = trendDelta(monthlyTrend.current, monthlyTrend.previous)

  const actions = useMemo(() => {
    if (!summary) return []
    const items: string[] = []
    if (summary.kpi.overdueCount > 0) {
      items.push(`${summary.kpi.overdueCount} gecikmis kayit icin tahsilat follow-up baslatin.`)
    }
    if (portfolioHighRisk.length > 0) {
      items.push(`${portfolioHighRisk.length} site yuksek riskte, tahsilat ve policy gozdencirmesi yapin.`)
    }
    if (weeklyDelta < 0) {
      items.push(`Haftalik tahsilat ivmesi %${Math.abs(weeklyDelta)} dustu, odeme kampanyasi planlayin.`)
    }
    if (items.length === 0) {
      items.push('Kritik risk gorunmuyor, policy ve rapor denetimini rutin takvimde surdurun.')
    }
    return items.slice(0, 3)
  }, [summary, portfolioHighRisk.length, weeklyDelta])

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Yönetim Dashboard"
        subtitle="Tenant seviyesinde executive karar panosu."
        actions={(
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedSiteId ?? ''}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              disabled={!hydrated || availableSites.length === 0}
              className="ledger-input bg-white min-w-52"
            >
              {availableSites.length === 0 ? (
                <option value="">Bina bulunamadi</option>
              ) : (
                availableSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.city})
                  </option>
                ))
              )}
            </select>
            <Link href="/work" className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white">
              İş Merkezi
            </Link>
          </div>
        )}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-[#6b7280]">Yükleniyor...</p>}

      {!loading && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <StaffKpiCard
            label="Site Sayısı"
            value={portfolio.length || availableSites.length}
          />
          <StaffKpiCard
            label="Toplam Açık Borç"
            value={formatTry(summary.kpi.totalDebt)}
          />
          <StaffKpiCard
            label="Tahsilat Oranı"
            value={`%${summary.kpi.collectionRate}`}
            railPercent={summary.kpi.collectionRate}
          />
          <StaffKpiCard
            label="Gecikmiş Kayıt"
            value={summary.kpi.overdueCount}
          />
        </div>
      )}

      {!loading && summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <StaffKpiCard
            label="Haftalik Tahsilat Trendi"
            value={formatTry(weeklyTrend.current)}
            hint={`Gecen haftaya gore ${weeklyDelta >= 0 ? '+' : ''}%${weeklyDelta}`}
            railPercent={Math.min(100, Math.max(0, weeklyDelta >= 0 ? 50 + weeklyDelta : 50 - Math.abs(weeklyDelta)))}
          />
          <StaffKpiCard
            label="Aylik Tahsilat Trendi"
            value={formatTry(monthlyTrend.current)}
            hint={`Gecen aya gore ${monthlyDelta >= 0 ? '+' : ''}%${monthlyDelta}`}
            railPercent={Math.min(100, Math.max(0, monthlyDelta >= 0 ? 50 + monthlyDelta : 50 - Math.abs(monthlyDelta)))}
          />
          <StaffKpiCard
            label="Yuksek Riskli Site"
            value={portfolioHighRisk.length}
            hint={portfolioMediumRisk.length > 0 ? `${portfolioMediumRisk.length} orta riskli site var` : 'Orta riskli site yok'}
          />
          <StaffKpiCard
            label="Acik Borc Islem Sayisi"
            value={summary.alerts.openDebtItems}
            hint={`${summary.alerts.highPriorityDebtors} yuksek oncelikli kayit`}
          />
        </div>
      )}

      {!loading && portfolio.length > 0 && (
        <div className="ledger-panel overflow-hidden">
          <div className="px-5 py-4 bg-[#f2f4f6]">
            <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Portfoy Risk Paneli</h2>
          </div>
          <div className="ledger-divider">
            {portfolio.map((site) => (
              <div key={site.id} className="px-5 py-3 flex items-center justify-between ledger-table-row-hover">
                <div>
                  <p className="text-sm font-semibold text-[#0c1427]">{site.name}</p>
                  <p className="text-xs text-[#6b7280] mt-0.5">{site.city} • Tahsilat %{site.collectionRate} • {formatTry(site.totalDebt)} acik borc</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6b7280] tabular-nums">{site.totalUnits} daire</span>
                  <StaffStatusPill
                    label={site.riskLevel === 'HIGH' ? 'Yuksek Risk' : site.riskLevel === 'MEDIUM' ? 'Orta Risk' : 'Dusuk Risk'}
                    tone={site.riskLevel === 'HIGH' ? 'danger' : site.riskLevel === 'MEDIUM' ? 'warning' : 'success'}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && summary && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="ledger-panel overflow-hidden">
            <div className="px-5 py-4 bg-[#f2f4f6]">
              <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Top Borclu Liste</h2>
            </div>
            <div className="ledger-divider">
              {topDebtors.map((row) => (
                <div key={row.id} className="px-5 py-3 flex items-center justify-between ledger-table-row-hover">
                  <div>
                    <p className="text-sm font-semibold text-[#0c1427]">{row.siteName} / {row.unitNumber}</p>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      {row.residentName ?? 'Sorumlu atanmamis'} • Vade: {formatShortDate(row.dueDate)} • {row.overdueDays} gun
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#0c1427]">{formatTry(row.remainingAmount)}</p>
                    <StaffStatusPill label={duesStatusLabel(row.status)} tone={duesStatusTone(row.status)} />
                  </div>
                </div>
              ))}
              {topDebtors.length === 0 && <p className="px-5 py-5 text-sm text-[#6b7280]">Acik borc kaydi bulunamadi.</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="ledger-panel overflow-hidden">
              <div className="px-5 py-4 bg-[#f2f4f6]">
                <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Aksiyon Onerileri</h2>
              </div>
              <div className="p-4 space-y-2">
                {actions.map((item) => (
                  <div key={item} className="rounded-md bg-[#f8f9fb] px-3 py-2 text-sm text-[#0c1427]">{item}</div>
                ))}
              </div>
            </div>

            <div className="ledger-panel overflow-hidden">
              <div className="px-5 py-4 bg-[#f2f4f6]">
                <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Son Tahsilatlar</h2>
              </div>
              <div className="ledger-divider">
                {(summary.recentPayments ?? []).slice(0, 6).map((payment) => (
                  <div key={payment.id} className="px-5 py-3 flex items-center justify-between ledger-table-row-hover">
                    <div>
                      <p className="text-sm font-semibold text-[#0c1427]">{payment.siteName} / {payment.unitNumber}</p>
                      <p className="text-xs text-[#6b7280] mt-0.5">{payment.residentName ?? 'Bilinmeyen'} • {paymentMethodLabel(payment.method)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#0c1427]">{formatTry(payment.amount)}</p>
                      <p className="text-xs text-[#6b7280]">{formatShortDate(payment.paidAt)}</p>
                    </div>
                  </div>
                ))}
                {summary.recentPayments.length === 0 && <p className="px-5 py-5 text-sm text-[#6b7280]">Tahsilat kaydi yok.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
