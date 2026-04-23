'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  Calendar,
  Percent,
  ShieldAlert,
  Wallet,
} from 'lucide-react'
import { DuesStatus } from '@sakin/shared'
import { useApiQuery } from '@/hooks/use-api'
import { useSiteContext } from '@/providers/site-provider'
import { ActionBanner, KpiCard, PageHeader, SectionTitle, StatusPill } from '@/components/surface'
import { duesStatusLabel, duesStatusTone, formatShortDate, formatTry, paymentMethodLabel } from '@/lib/formatters'
import { buildFilterParams } from '@/lib/query-params'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { PaymentCollectModal } from '@/components/payment-collect-modal'
import { ViewStatePanel } from '@/components/view-state-panel'
import type { ActionCard } from '@/lib/ui-contracts'
import { UI_COPY } from '@/lib/ui-copy'

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
  totals: { confirmedAmount: number }
}

function trendDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function getDateRange(daysAgo: number, daysEnd: number) {
  const now = new Date()
  const from = new Date(now)
  from.setDate(now.getDate() - daysAgo)
  const to = new Date(now)
  to.setDate(now.getDate() - daysEnd)
  return { from: from.toISOString(), to: to.toISOString() }
}

interface CollectTarget {
  duesId: string
  unitNumber: string
  siteName: string
  residentName: string | null
  remainingAmount: number
}

export default function DashboardPage() {
  const { selectedSiteId, availableSites, hydrated, error: siteError } = useSiteContext()
  const [collectTarget, setCollectTarget] = useState<CollectTarget | null>(null)

  const summaryParams = buildFilterParams({ siteId: selectedSiteId ?? undefined })

  const { data: summary, isLoading: summaryLoading } = useApiQuery<WorkSummaryResponse>(
    ['work-summary', { siteId: selectedSiteId }],
    '/tenant/work-summary',
    summaryParams,
    { enabled: hydrated },
  )

  const { data: portfolio = [] } = useApiQuery<PortfolioResponse[]>(
    ['portfolio'],
    '/tenant/work-portfolio',
    undefined,
    { enabled: hydrated },
  )

  // Weekly trend
  const weekRange = getDateRange(7, 0)
  const prevWeekRange = getDateRange(14, 7)

  const { data: weekCurrent } = useApiQuery<ReconciliationSummary>(
    ['reconciliation-week', { siteId: selectedSiteId }],
    '/payments/reconciliation-summary',
    buildFilterParams({ siteId: selectedSiteId ?? undefined, dateFrom: weekRange.from, dateTo: weekRange.to }),
    { enabled: hydrated },
  )

  const { data: weekPrev } = useApiQuery<ReconciliationSummary>(
    ['reconciliation-prev-week', { siteId: selectedSiteId }],
    '/payments/reconciliation-summary',
    buildFilterParams({ siteId: selectedSiteId ?? undefined, dateFrom: prevWeekRange.from, dateTo: prevWeekRange.to }),
    { enabled: hydrated },
  )

  // Monthly trend
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const prevMonthEnd = monthStart

  const { data: monthCurrent } = useApiQuery<ReconciliationSummary>(
    ['reconciliation-month', { siteId: selectedSiteId }],
    '/payments/reconciliation-summary',
    buildFilterParams({ siteId: selectedSiteId ?? undefined, dateFrom: monthStart, dateTo: now.toISOString() }),
    { enabled: hydrated },
  )

  const { data: monthPrev } = useApiQuery<ReconciliationSummary>(
    ['reconciliation-prev-month', { siteId: selectedSiteId }],
    '/payments/reconciliation-summary',
    buildFilterParams({ siteId: selectedSiteId ?? undefined, dateFrom: prevMonthStart, dateTo: prevMonthEnd }),
    { enabled: hydrated },
  )

  const portfolioHighRisk = portfolio.filter((s) => s.riskLevel === 'HIGH')
  const portfolioMediumRisk = portfolio.filter((s) => s.riskLevel === 'MEDIUM')
  const topDebtors = (summary?.debtors ?? []).slice().sort((a, b) => b.remainingAmount - a.remainingAmount).slice(0, 6)
  const selectedSiteName = useMemo(
    () => availableSites.find((site) => site.id === selectedSiteId)?.name,
    [availableSites, selectedSiteId],
  )

  const weeklyDelta = trendDelta(weekCurrent?.totals.confirmedAmount ?? 0, weekPrev?.totals.confirmedAmount ?? 0)
  const monthlyDelta = trendDelta(monthCurrent?.totals.confirmedAmount ?? 0, monthPrev?.totals.confirmedAmount ?? 0)

  const actionCards = useMemo((): ActionCard[] => {
    if (!summary) return []
    return [
      {
        priority: 'high',
        metric: `${summary.kpi.overdueCount} gecikmiş kayıt`,
        message: UI_COPY.dashboard.actionCards.overdueMessage,
        ctaLabel: UI_COPY.dashboard.actionCards.overdueCta,
        ctaTarget: '/finance',
      },
      {
        priority: summary.kpi.overdueCount > 0 ? 'high' : 'medium',
        metric: `Açık borç ${formatTry(summary.kpi.totalDebt)}`,
        message: UI_COPY.dashboard.actionCards.overdueListMessage,
        ctaLabel: UI_COPY.dashboard.actionCards.overdueListCta,
        ctaTarget: '/finance?status=OVERDUE',
      },
      {
        priority: 'low',
        metric: `${summary.alerts.openDebtItems} açık borç işlemi`,
        message: UI_COPY.dashboard.actionCards.residentMessage,
        ctaLabel: UI_COPY.dashboard.actionCards.residentCta,
        ctaTarget: '/residents',
      },
    ]
  }, [summary])

  if (siteError) {
    return (
      <ViewStatePanel
        state="error"
        title={UI_COPY.dashboard.siteErrorTitle}
        description={siteError}
        actionLabel={UI_COPY.dashboard.siteErrorAction}
        actionHref="/dashboard"
      />
    )
  }

  return (
    <div className="space-y-6 motion-in">
      <PageHeader
        title={UI_COPY.dashboard.title}
        eyebrow={UI_COPY.dashboard.eyebrow}
        subtitle={
          selectedSiteName
            ? `${selectedSiteName} ${UI_COPY.dashboard.selectedSiteSubtitleSuffix}`
            : UI_COPY.dashboard.portfolioSubtitle
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden rounded-full border border-white/80 bg-white/74 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#63758d] shadow-[0_10px_24px_rgba(8,17,31,0.05)] md:inline-flex">
              {selectedSiteName ?? UI_COPY.dashboard.portfolioChip}
            </div>
            <Link href="/finance">
              <Button size="sm">{UI_COPY.dashboard.quickActions.collection}</Button>
            </Link>
            <Link href="/finance?status=OVERDUE">
              <Button size="sm" variant="outline">{UI_COPY.dashboard.quickActions.overdue}</Button>
            </Link>
            <Link href="/residents">
              <Button size="sm" variant="outline">{UI_COPY.dashboard.quickActions.residents}</Button>
            </Link>
          </div>
        }
      />

      {/* KPI Row 1 */}
      {summaryLoading ? (
        <div className="motion-stagger grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiCard label="Site Sayısı" value={portfolio.length || availableSites.length} icon={Building2} tone="blue" />
          <KpiCard label="Toplam Açık Borç" value={formatTry(summary.kpi.totalDebt)} icon={Wallet} tone="navy" />
          <KpiCard label="Tahsilat Oranı" value={`%${summary.kpi.collectionRate}`} railPercent={summary.kpi.collectionRate} icon={Percent} tone="cyan" />
          <KpiCard label="Gecikmiş Kayıt" value={summary.kpi.overdueCount} icon={AlertTriangle} tone="rose" />
        </div>
      ) : null}

      {/* KPI Row 2 - Trends */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiCard
            label="Haftalık Tahsilat"
            value={formatTry(weekCurrent?.totals.confirmedAmount ?? 0)}
            hint={`Geçen haftaya göre ${weeklyDelta >= 0 ? '+' : ''}%${weeklyDelta}`}
            icon={Calendar}
            tone="blue"
          />
          <KpiCard
            label="Aylık Tahsilat"
            value={formatTry(monthCurrent?.totals.confirmedAmount ?? 0)}
            hint={`Geçen aya göre ${monthlyDelta >= 0 ? '+' : ''}%${monthlyDelta}`}
            icon={BarChart3}
            tone="emerald"
          />
          <KpiCard
            label="Yüksek Riskli Site"
            value={portfolioHighRisk.length}
            hint={`${portfolioMediumRisk.length} orta riskli`}
            icon={ShieldAlert}
            tone="amber"
          />
          <KpiCard
            label="Açık Borç İşlem"
            value={summary.alerts.openDebtItems}
            hint={`${summary.alerts.highPriorityDebtors} yüksek öncelikli`}
            icon={Activity}
            tone="navy"
          />
        </div>
      )}

      {/* Portfolio Risk Panel */}
      {portfolio.length > 0 && (
        <div className="ledger-panel overflow-hidden">
          <SectionTitle title={UI_COPY.dashboard.sections.portfolioRiskTitle} subtitle={UI_COPY.dashboard.sections.portfolioRiskSubtitle} />
          <div className="ledger-divider">
            {portfolio.map((site) => (
              <div key={site.id} className="px-4 py-3 lg:px-5">
                <div className="ledger-table-row-hover flex flex-col gap-3 rounded-[22px] border border-white/72 bg-white/46 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#102038]">{site.name}</p>
                    <p className="mt-1 text-xs leading-6 text-[#6b7d93]">{site.city} · Tahsilat %{site.collectionRate} · {formatTry(site.totalDebt)} açık borç</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#dce7f6] bg-[#f7faff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6480ab] tabular-nums">
                      {site.totalUnits} daire
                    </span>
                    <span className="rounded-full border border-[#dce7f6] bg-[#f7faff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6480ab]">
                      %{site.occupancyRate} doluluk
                    </span>
                    <StatusPill
                      label={site.riskLevel === 'HIGH' ? 'Yüksek Risk' : site.riskLevel === 'MEDIUM' ? 'Orta Risk' : 'Düşük Risk'}
                      tone={site.riskLevel === 'HIGH' ? 'danger' : site.riskLevel === 'MEDIUM' ? 'warning' : 'success'}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Grid: Debtors + Actions + Recent Payments */}
      {summary && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="ledger-panel overflow-hidden">
            <SectionTitle title={UI_COPY.dashboard.sections.topDebtorsTitle} subtitle={UI_COPY.dashboard.sections.topDebtorsSubtitle} />
            <div className="ledger-divider">
              {topDebtors.map((row) => (
                <div key={row.id} className="px-4 py-3 lg:px-5">
                  <div className="ledger-table-row-hover flex items-center justify-between gap-3 rounded-[22px] border border-white/72 bg-white/46 px-4 py-4">
                    <Link href={`/units/${row.id}`} className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#102038]">{row.siteName} / {row.unitNumber}</p>
                      <p className="mt-1 text-xs leading-6 text-[#6b7d93]">
                        {row.residentName ?? UI_COPY.dashboard.unassignedResident} · Vade: {formatShortDate(row.dueDate)} · {row.overdueDays} gün
                      </p>
                    </Link>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#102038]">{formatTry(row.remainingAmount)}</p>
                        <StatusPill label={duesStatusLabel(row.status)} tone={duesStatusTone(row.status)} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setCollectTarget({
                          duesId: row.duesId,
                          unitNumber: row.unitNumber,
                          siteName: row.siteName,
                          residentName: row.residentName,
                          remainingAmount: row.remainingAmount,
                        })}
                        className="rounded-2xl border border-[#0f766e]/10 bg-[linear-gradient(135deg,#0f766e,#10b981)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_14px_28px_rgba(16,185,129,0.24)] transition-all hover:-translate-y-0.5"
                      >
                        {UI_COPY.dashboard.collectButton}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {topDebtors.length === 0 && <p className="px-5 py-5 text-sm text-[#6b7280]">{UI_COPY.dashboard.sections.topDebtorsEmpty}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="ledger-panel overflow-hidden">
              <SectionTitle title={UI_COPY.dashboard.sections.operationsTitle} subtitle={UI_COPY.dashboard.sections.operationsSubtitle} />
              <div className="p-3 space-y-2">
                {actionCards.map((card) => (
                  <ActionBanner key={card.ctaTarget} card={card} />
                ))}
              </div>
            </div>

            <div className="ledger-panel overflow-hidden">
              <SectionTitle title={UI_COPY.dashboard.sections.dayEndTitle} subtitle={UI_COPY.dashboard.sections.dayEndSubtitle} />
              <div className="p-3 space-y-2">
                <div className="rounded-[20px] border border-white/80 bg-white/78 px-4 py-3 text-sm text-[#16263d]">
                  <p className="font-semibold">{UI_COPY.dashboard.checklist.step1Title}</p>
                  <p className="mt-1 text-xs text-[#617287]">
                    {UI_COPY.dashboard.checklist.step1NotePrefix} {formatTry(weekCurrent?.totals.confirmedAmount ?? 0)}
                  </p>
                </div>
                <div className="rounded-[20px] border border-white/80 bg-white/78 px-4 py-3 text-sm text-[#16263d]">
                  <p className="font-semibold">{UI_COPY.dashboard.checklist.step2Title}</p>
                  <p className="mt-1 text-xs text-[#617287]">
                    {UI_COPY.dashboard.checklist.step2HighRiskPrefix} {portfolioHighRisk.length} • {UI_COPY.dashboard.checklist.step2OpenDebtPrefix} {summary.alerts.openDebtItems}
                  </p>
                </div>
                <div className="rounded-[20px] border border-white/80 bg-white/78 px-4 py-3 text-sm text-[#16263d]">
                  <p className="font-semibold">{UI_COPY.dashboard.checklist.step3Title}</p>
                  <p className="mt-1 text-xs text-[#617287]">
                    {UI_COPY.dashboard.checklist.step3OverduePrefix} {summary.kpi.overdueCount} • {UI_COPY.dashboard.checklist.step3OverdueDebtPrefix} {formatTry(summary.kpi.overdueDebt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="ledger-panel overflow-hidden">
              <SectionTitle title={UI_COPY.dashboard.sections.recentPaymentsTitle} subtitle={UI_COPY.dashboard.sections.recentPaymentsSubtitle} />
              <div className="ledger-divider">
                {(summary.recentPayments ?? []).slice(0, 6).map((payment) => (
                  <div key={payment.id} className="px-4 py-3 lg:px-5">
                    <div className="ledger-table-row-hover flex items-center justify-between gap-3 rounded-[22px] border border-white/72 bg-white/46 px-4 py-4">
                      <div>
                        <p className="text-sm font-semibold text-[#102038]">{payment.siteName} / {payment.unitNumber}</p>
                        <p className="mt-1 text-xs leading-6 text-[#6b7d93]">{payment.residentName ?? UI_COPY.dashboard.unknownResident} · {paymentMethodLabel(payment.method)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#102038]">{formatTry(payment.amount)}</p>
                        <p className="text-xs text-[#6b7280]">{formatShortDate(payment.paidAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {summary.recentPayments.length === 0 && <p className="px-5 py-5 text-sm text-[#6b7280]">{UI_COPY.dashboard.sections.recentPaymentsEmpty}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      <PaymentCollectModal
        open={!!collectTarget}
        onClose={() => setCollectTarget(null)}
        initialDuesId={collectTarget?.duesId}
        presetAmount={collectTarget?.remainingAmount}
        context={collectTarget ? {
          unitNumber: collectTarget.unitNumber,
          siteName: collectTarget.siteName,
          residentName: collectTarget.residentName ?? undefined,
          totalDebt: collectTarget.remainingAmount,
        } : undefined}
      />
    </div>
  )
}
