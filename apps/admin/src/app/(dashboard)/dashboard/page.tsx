'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api'
import { useSiteContext } from '@/providers/site-provider'
import { StaffKpiCard, StaffPageHeader } from '@/components/staff-surface'
import { formatTry } from '@/lib/work-presenters'
import { workQuery } from '@/lib/work-query'

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
}

interface PortfolioResponse {
  sites: Array<{
    id: string
    name: string
    totalUnits: number
    city: string
  }>
  totals: {
    siteCount: number
    unitCount: number
    residentCount: number
  }
}

export default function DashboardPage() {
  const { selectedSiteId, availableSites, hydrated, error: siteError } = useSiteContext()
  const [summary, setSummary] = useState<WorkSummaryResponse | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hydrated) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [summaryData, portfolioData] = await Promise.all([
          apiClient<WorkSummaryResponse>('/tenant/work-summary', {
            params: workQuery({ siteId: selectedSiteId ?? undefined }),
          }),
          apiClient<PortfolioResponse>('/tenant/work-portfolio'),
        ])
        setSummary(summaryData)
        setPortfolio(portfolioData)
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

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Yönetim Dashboard"
        subtitle="Tenant seviyesinde operasyon ve finans takibi."
        actions={(
          <Link href="/work" className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white">
            İş Merkezi
          </Link>
        )}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-[#6b7280]">Yükleniyor...</p>}

      {!loading && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <StaffKpiCard
            label="Site Sayısı"
            value={portfolio?.totals.siteCount ?? availableSites.length}
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

      {!loading && portfolio && (
        <div className="ledger-panel overflow-hidden">
          <div className="px-5 py-4 bg-[#f2f4f6]">
            <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Portföy Siteleri</h2>
          </div>
          <div className="ledger-divider">
            {portfolio.sites.map((site) => (
              <div key={site.id} className="px-5 py-3 flex items-center justify-between ledger-table-row-hover">
                <div>
                  <p className="text-sm font-semibold text-[#0c1427]">{site.name}</p>
                  <p className="text-xs text-[#6b7280] mt-0.5">{site.city}</p>
                </div>
                <span className="text-xs text-[#6b7280] tabular-nums">{site.totalUnits} daire</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
