'use client'

import { useApiQuery } from '@/hooks/use-api'
import { useAuth } from '@/providers/auth-provider'
import { useSiteContext } from '@/providers/site-provider'
import { UserRole } from '@sakin/shared'
import { AlertTriangle, Percent, Wallet, Receipt } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/surface'
import { ScopedBreadcrumb } from '@/components/scoped-breadcrumb'
import { formatTry } from '@/lib/formatters'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { DuesRecordsPanel } from '../dues/_components/dues-records-panel'
import { PaymentsPanel } from './_components/payments-panel'
import { DuesCreatePanel } from './_components/dues-create-panel'
import { ExpensesPanel } from './_components/expenses-panel'

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
  const { role } = useAuth()
  const { selectedSiteId, hydrated } = useSiteContext()
  const isTenantAdmin = role === UserRole.TENANT_ADMIN

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
        <PageHeader title="Tahsilat" subtitle="Borç durumu, tahsilat takibi ve aidat yönetimi." />
        <div className="ledger-panel p-6">
          <p className="text-sm text-[#6b7280]">Tahsilat yönetimi için önce bir site seçin.</p>
        </div>
      </div>
    )
  }

  if (!isTenantAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tahsilat" subtitle="Borç durumu, tahsilat takibi ve aidat yönetimi." />
        <div className="ledger-panel p-6">
          <p className="text-sm text-[#6b7280]">Bu ekran yalnızca yönetici yetkisiyle kullanılabilir.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 motion-in">
      <ScopedBreadcrumb module="Tahsilat" />
      <PageHeader
        title="Tahsilat"
        eyebrow="Finans Operasyonu"
        subtitle="Borç durumu, tahsilat takibi ve aidat yönetimi tek ekranda."
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

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">
            Borç Durumu
          </TabsTrigger>
          <TabsTrigger value="payments">
            Tahsilatlar
          </TabsTrigger>
          <TabsTrigger value="create">
            Aidat & Gider Oluştur
          </TabsTrigger>
          <TabsTrigger value="expenses">
            Giderler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-4">
          <DuesRecordsPanel siteId={selectedSiteId} />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <PaymentsPanel siteId={selectedSiteId} />
        </TabsContent>

        <TabsContent value="create" className="mt-4">
          <DuesCreatePanel siteId={selectedSiteId} />
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <ExpensesPanel siteId={selectedSiteId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
