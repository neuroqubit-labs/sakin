'use client'

import { useApiQuery } from '@/hooks/use-api'
import { useAuth } from '@/providers/auth-provider'
import { useSiteContext } from '@/providers/site-provider'
import { UserRole } from '@sakin/shared'
import { PageHeader, KpiCard } from '@/components/surface'
import { formatTry } from '@/lib/formatters'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { DuesPolicyPanel } from './_components/dues-policy-panel'
import { DuesPeriodPanel } from './_components/dues-period-panel'
import { DuesRecordsPanel } from './_components/dues-records-panel'

interface DuesKpiResponse {
  kpi: {
    totalDebt: number
    collectionRate: number
    overdueCount: number
    overdueDebt: number
    thisMonthCollection: number
  }
}

export default function DuesPage() {
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
      <div className="space-y-6">
        <PageHeader title="Aidatlar" subtitle="Aidat tanımları, dönem yönetimi ve mutabakat işlemleri." />
        <div className="ledger-panel p-6">
          <p className="text-sm text-[#6b7280]">Aidat yönetimi için önce bir site seçin.</p>
        </div>
      </div>
    )
  }

  if (!isTenantAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Aidatlar" subtitle="Aidat tanımları, dönem yönetimi ve mutabakat işlemleri." />
        <div className="ledger-panel p-6">
          <p className="text-sm text-[#6b7280]">Bu ekran yalnızca yönetici yetkisiyle kullanılabilir.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aidatlar"
        subtitle="Aidat tanımları, dönem yönetimi ve mutabakat işlemleri."
      />

      {/* KPI Row */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard label="Tahsilat Oranı" value={`%${summary.kpi.collectionRate}`} railPercent={summary.kpi.collectionRate} />
          <KpiCard label="Toplam Açık Borç" value={formatTry(summary.kpi.totalDebt)} />
          <KpiCard label="Gecikmiş Kayıt" value={summary.kpi.overdueCount} />
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs defaultValue="records">
        <TabsList className="bg-[#f2f4f6] p-1 rounded-lg">
          <TabsTrigger value="records" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-semibold">
            Kayıtlar
          </TabsTrigger>
          <TabsTrigger value="definitions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-semibold">
            Tanımlar
          </TabsTrigger>
          <TabsTrigger value="period" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-semibold">
            Dönem İşlemleri
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-4">
          <DuesRecordsPanel siteId={selectedSiteId} />
        </TabsContent>

        <TabsContent value="definitions" className="mt-4">
          <DuesPolicyPanel siteId={selectedSiteId} />
        </TabsContent>

        <TabsContent value="period" className="mt-4">
          <DuesPeriodPanel siteId={selectedSiteId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
