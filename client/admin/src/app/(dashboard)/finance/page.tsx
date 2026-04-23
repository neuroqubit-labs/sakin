'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useApiQuery } from '@/hooks/use-api'
import { useAuth } from '@/providers/auth-provider'
import { useSiteContext } from '@/providers/site-provider'
import { UserRole } from '@sakin/shared'
import { AlertTriangle, Percent, Wallet, Receipt } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/surface'
import { ScopedBreadcrumb } from '@/components/scoped-breadcrumb'
import { formatShortDate, formatTry } from '@/lib/formatters'
import { Skeleton } from '@/components/ui/skeleton'
import { DuesRecordsPanel } from '../dues/_components/dues-records-panel'
import { ViewStatePanel } from '@/components/view-state-panel'
import { getRouteFallbackMessage } from '@/lib/access-policy'
import { PaymentCollectModal } from '@/components/payment-collect-modal'
import { UI_COPY } from '@/lib/ui-copy'

interface DuesKpiResponse {
  kpi: {
    totalDebt: number
    collectionRate: number
    overdueCount: number
    overdueDebt: number
    thisMonthCollection: number
  }
}

export default function FinancePage() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { role } = useAuth()
  const { selectedSiteId, hydrated } = useSiteContext()
  const isTenantAdmin = role === UserRole.TENANT_ADMIN
  const [collectTarget, setCollectTarget] = useState<{
    duesId: string
    unitNumber: string
    siteName: string
    remainingAmount: number
  } | null>(null)
  const [lastCollected, setLastCollected] = useState<{
    unitNumber: string
    amount: number
    collectedAt: string
  } | null>(null)

  const statusFromQuery = useMemo(() => searchParams.get('status') ?? undefined, [searchParams])

  const { data: summary, isLoading: summaryLoading } = useApiQuery<DuesKpiResponse>(
    ['work-summary', { siteId: selectedSiteId }],
    '/tenant/work-summary',
    { siteId: selectedSiteId ?? undefined },
    { enabled: hydrated && !!selectedSiteId },
  )

  if (!hydrated) return null

  if (!selectedSiteId) {
    return (
      <div className="space-y-6 motion-in">
        <PageHeader title={UI_COPY.finance.title} subtitle={UI_COPY.finance.subtitle} />
        <ViewStatePanel
          state="empty"
          title={UI_COPY.finance.siteRequiredTitle}
          description={UI_COPY.finance.siteRequiredDescription}
        />
      </div>
    )
  }

  if (!isTenantAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title={UI_COPY.finance.title} subtitle={UI_COPY.finance.subtitle} />
        <ViewStatePanel
          state="unauthorized"
          title={UI_COPY.finance.unauthorizedTitle}
          description={getRouteFallbackMessage('/finance') ?? UI_COPY.finance.unauthorizedDescription}
          actionLabel={UI_COPY.common.paymentsPageAction}
          actionHref="/payments"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 motion-in">
      <ScopedBreadcrumb module="Tahsilat" />
      <PageHeader
        title={UI_COPY.finance.title}
        eyebrow={UI_COPY.finance.eyebrow}
        subtitle={UI_COPY.finance.heroSubtitle}
      />

      {summaryLoading ? (
        <div className="motion-stagger grid grid-cols-1 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <KpiCard label="Tahsilat Oranı" value={`%${summary.kpi.collectionRate}`} railPercent={summary.kpi.collectionRate} icon={Percent} tone="cyan" />
          <KpiCard label="Toplam Açık Borç" value={formatTry(summary.kpi.totalDebt)} icon={Wallet} tone="navy" />
          <KpiCard label="Bu Ay Tahsilat" value={formatTry(summary.kpi.thisMonthCollection)} icon={Receipt} tone="emerald" />
          <KpiCard label="Gecikmiş Kayıt" value={summary.kpi.overdueCount} icon={AlertTriangle} tone="rose" />
        </div>
      ) : null}

      {lastCollected ? (
        <div className="ledger-panel p-4 md:p-5">
          <p className="ledger-label">Kayıt Doğrulama</p>
          <p className="mt-2 text-sm font-semibold text-[#13243c]">
            Daire {lastCollected.unitNumber} için {formatTry(lastCollected.amount)} tahsilat kaydı oluşturuldu.
          </p>
          <p className="mt-1 text-xs text-[#617287]">
            İşlem zamanı: {formatShortDate(lastCollected.collectedAt)}. Liste ve KPI verileri yenilendi.
          </p>
        </div>
      ) : null}

      <DuesRecordsPanel
        siteId={selectedSiteId}
        initialStatusFilter={statusFromQuery}
        onCollect={(payload) => setCollectTarget(payload)}
      />

      <PaymentCollectModal
        open={!!collectTarget}
        onClose={() => setCollectTarget(null)}
        initialDuesId={collectTarget?.duesId}
        presetAmount={collectTarget?.remainingAmount}
        context={collectTarget ? {
          unitNumber: collectTarget.unitNumber,
          siteName: collectTarget.siteName,
          totalDebt: collectTarget.remainingAmount,
        } : undefined}
        onRecorded={(payload) => {
          setLastCollected({
            unitNumber: payload.unitNumber,
            amount: payload.amount,
            collectedAt: payload.paidAt,
          })
        }}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ['dues-list'] })
          await queryClient.invalidateQueries({ queryKey: ['work-summary'] })
          await queryClient.invalidateQueries({ queryKey: ['payments'] })
        }}
      />
    </div>
  )
}
