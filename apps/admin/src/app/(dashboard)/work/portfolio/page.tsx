'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api'
import { useSiteContext } from '@/providers/site-provider'
import { formatTry, riskLabel, riskTone } from '@/lib/work-presenters'
import { StaffKpiCard, StaffPageHeader, StaffStatusPill } from '@/components/staff-surface'

interface PortfolioRow {
  id: string
  name: string
  city: string
  totalUnits: number
  occupiedUnits: number
  occupancyRate: number
  totalDebt: number
  expectedCollection: number
  totalCollected: number
  collectionRate: number
  thisMonthCollection: number
  overdueUnits: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  isActive: boolean
}

export default function WorkPortfolioPage() {
  const { selectedSiteId, setSelectedSiteId } = useSiteContext()
  const [rows, setRows] = useState<PortfolioRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiClient<PortfolioRow[]>('/tenant/work-portfolio')
        setRows(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Portföy verisi alınamadı')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const stats = useMemo(() => {
    const totalSites = rows.length
    const totalUnits = rows.reduce((sum, row) => sum + row.totalUnits, 0)
    const occupiedUnits = rows.reduce((sum, row) => sum + row.occupiedUnits, 0)
    const totalDebt = rows.reduce((sum, row) => sum + row.totalDebt, 0)
    const expected = rows.reduce((sum, row) => sum + row.expectedCollection, 0)
    const monthCollection = rows.reduce((sum, row) => sum + row.thisMonthCollection, 0)
    return {
      totalSites,
      totalUnits,
      totalDebt,
      expected,
      monthCollection,
      occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
    }
  }, [rows])

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Portföy Yönetimi"
        subtitle="Bina bazlı doluluk, tahsilat performansı ve risk seviyesini tek ekranda izleyin."
        actions={(
          <div className="flex bg-[#e0e3e5] p-1 rounded-md">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'list' ? 'bg-white text-[#0c1427]' : 'text-[#556171]'}`}
            >
              Liste
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'grid' ? 'bg-white text-[#0c1427]' : 'text-[#556171]'}`}
            >
              Grid
            </button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <StaffKpiCard label="Toplam Bina" value={stats.totalSites} hint="Aktif portföy" />
        <StaffKpiCard label="Genel Doluluk" value={`%${stats.occupancyRate}`} railPercent={stats.occupancyRate} railClassName="bg-[#006e2d]" />
        <StaffKpiCard label="Toplam Daire" value={stats.totalUnits} hint="Tenant kapsamı" />
        <StaffKpiCard label="Toplam Gecikmiş Borç" value={<span className="text-[#ba1a1a]">{formatTry(stats.totalDebt)}</span>} railPercent={Math.min(100, stats.totalDebt / 2000)} railClassName="bg-[#ba1a1a]" />
        <StaffKpiCard label="Bu Ay Tahsilat" value={<span className="text-[#006e2d]">{formatTry(stats.monthCollection)}</span>} hint={`Beklenen ${formatTry(stats.expected)}`} />
      </div>

      {loading && <p className="text-sm text-[#6b7280]">Yükleniyor...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && viewMode === 'list' && (
        <div className="ledger-panel overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
            <span className="col-span-3">Bina Bilgisi</span>
            <span className="col-span-2 text-center">Toplam Daire</span>
            <span className="col-span-2">Doluluk</span>
            <span className="col-span-2 text-right">Aylık Tahsilat</span>
            <span className="col-span-2 text-right">Toplam Borç</span>
            <span className="col-span-1 text-right">Aksiyon</span>
          </div>

          <div className="ledger-divider">
            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-12 px-5 py-4 items-center ledger-table-row-hover">
                <div className="col-span-3">
                  <p className="text-sm font-semibold text-[#0c1427] tracking-tight">{row.name}</p>
                  <p className="text-xs text-[#6b7280] mt-1">{row.city}</p>
                  <div className="mt-2">
                    <StaffStatusPill label={riskLabel(row.riskLevel)} tone={riskTone(row.riskLevel)} />
                  </div>
                </div>
                <p className="col-span-2 text-center text-sm tabular-nums">{row.totalUnits}</p>
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-full rounded-full bg-[#e0e3e5] overflow-hidden">
                      <span className="block h-full rounded-full bg-[#006e2d]" style={{ width: `${row.occupancyRate}%` }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums text-[#0c1427]">%{row.occupancyRate}</span>
                  </div>
                </div>
                <p className="col-span-2 text-right text-sm tabular-nums">{formatTry(row.thisMonthCollection)}</p>
                <div className="col-span-2 text-right">
                  <p className="text-sm font-semibold tabular-nums text-[#ba1a1a]">{formatTry(row.totalDebt)}</p>
                  <p className="text-[11px] text-[#6b7280]">{row.overdueUnits} gecikmiş ünite</p>
                </div>
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedSiteId(row.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold ${selectedSiteId === row.id ? 'bg-[#d8f7dd] text-[#006e2d]' : 'ledger-gradient text-white'}`}
                  >
                    {selectedSiteId === row.id ? 'Aktif' : 'Seç'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelectedSiteId(row.id)}
              className={`ledger-panel p-4 text-left transition-colors ${selectedSiteId === row.id ? 'bg-[#f2f4f6]' : 'hover:bg-[#f2f4f6]'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#0c1427]">{row.name}</p>
                  <p className="text-xs text-[#6b7280] mt-1">{row.city}</p>
                </div>
                <StaffStatusPill label={riskLabel(row.riskLevel)} tone={riskTone(row.riskLevel)} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-[#f2f4f6] rounded-md p-2">
                  <p className="text-[10px] text-[#6b7280] uppercase">Doluluk</p>
                  <p className="text-sm font-bold tabular-nums text-[#0c1427]">%{row.occupancyRate}</p>
                </div>
                <div className="bg-[#f2f4f6] rounded-md p-2">
                  <p className="text-[10px] text-[#6b7280] uppercase">Borç</p>
                  <p className="text-sm font-bold tabular-nums text-[#ba1a1a]">{formatTry(row.totalDebt)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <div className="xl:col-span-2 ledger-panel-soft p-5">
            <p className="text-xs font-bold tracking-[0.16em] uppercase text-[#4e5d6d]">Portföy Snapshot</p>
            <p className="text-sm text-[#0c1427] font-semibold mt-2">Bina yoğunluğu ve tahsilat yükü dağılımı</p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {rows.slice(0, 8).map((row) => (
                <div key={row.id} className="rounded-md bg-white px-2 py-3 text-center">
                  <p className="text-[11px] font-bold text-[#0c1427] truncate">{row.name}</p>
                  <p className="text-[10px] text-[#6b7280] mt-1 tabular-nums">%{row.collectionRate}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="ledger-panel p-5">
            <p className="text-xs font-bold tracking-[0.16em] uppercase text-[#4e5d6d]">Risk Dağılımı</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Yüksek</span>
                <span className="font-bold tabular-nums">{rows.filter((r) => r.riskLevel === 'HIGH').length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Orta</span>
                <span className="font-bold tabular-nums">{rows.filter((r) => r.riskLevel === 'MEDIUM').length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Düşük</span>
                <span className="font-bold tabular-nums">{rows.filter((r) => r.riskLevel === 'LOW').length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
