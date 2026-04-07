'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useSiteContext } from '@/providers/site-provider'
import { StaffKpiCard, StaffPageHeader, StaffStatusPill } from '@/components/staff-surface'
import { formatShortDate, formatTry } from '@/lib/work-presenters'
import { workQuery } from '@/lib/work-query'

interface UnitsResponse {
  data: Array<{
    id: string
    number: string
    floor: number | null
    isActive: boolean
    block: { name: string } | null
    residents: Array<{ firstName: string; lastName: string; type: string }>
    site: { name: string }
    financial: {
      totalAmount: number
      totalPaid: number
      openDebt: number
      overdueCount: number
      nextDueDate: string | null
      status: 'OVERDUE' | 'DEBTOR' | 'CLEAR'
    }
  }>
  meta: { total: number }
}

interface BlockRow {
  id: string
  name: string
}

export default function WorkUnitsPage() {
  const { selectedSiteId, hydrated, error: siteError } = useSiteContext()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'ALL' | 'CLEAR' | 'DEBTOR' | 'OVERDUE'>('ALL')
  const [blockId, setBlockId] = useState<string>('ALL')
  const [floor, setFloor] = useState<string>('')

  const [units, setUnits] = useState<UnitsResponse['data']>([])
  const [blocks, setBlocks] = useState<BlockRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setSearch(q)
  }, [searchParams])

  useEffect(() => {
    if (!hydrated || !selectedSiteId) return

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [unitsResponse, blocksResponse] = await Promise.all([
          apiClient<UnitsResponse>('/units', {
            params: workQuery({
              siteId: selectedSiteId,
              page: 1,
              limit: 300,
              isActive: true,
              search: search.trim() || undefined,
              financialStatus: status === 'ALL' ? undefined : status,
              blockId: blockId === 'ALL' ? undefined : blockId,
              floor: floor.trim() ? Number(floor) : undefined,
            }),
          }),
          apiClient<BlockRow[]>(`/sites/${selectedSiteId}/blocks`),
        ])
        setUnits(unitsResponse.data)
        setBlocks(blocksResponse)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Daireler alınamadı')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [selectedSiteId, hydrated, search, status, blockId, floor])

  useEffect(() => {
    if (hydrated && !selectedSiteId) {
      setLoading(false)
    }
  }, [hydrated, selectedSiteId])

  const stats = useMemo(() => {
    const total = units.length
    const clean = units.filter((unit) => unit.financial.status === 'CLEAR').length
    const debtor = units.filter((unit) => unit.financial.status === 'DEBTOR').length
    const overdue = units.filter((unit) => unit.financial.status === 'OVERDUE').length
    const totalDebt = units.reduce((sum, unit) => sum + unit.financial.openDebt, 0)

    const trendBars = [clean, debtor, overdue, total]
    const max = Math.max(...trendBars, 1)
    return {
      total,
      clean,
      debtor,
      overdue,
      totalDebt,
      trend: trendBars.map((value) => Math.max(20, Math.round((value / max) * 100))),
    }
  }, [units])

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Daire Yönetimi ve Finans"
        subtitle="Daire operasyonu, sakin bilgisi ve finansal sağlık tek tabloda."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StaffKpiCard label="Filtrelenmiş Daire" value={stats.total} hint="Anlık sonuç kümesi" />
        <StaffKpiCard label="Toplam Açık Borç" value={<span className="text-[#ba1a1a]">{formatTry(stats.totalDebt)}</span>} />
        <StaffKpiCard label="Borçlu Daire" value={stats.debtor} hint={`${stats.overdue} gecikmiş`} />
        <StaffKpiCard label="Temiz Daire" value={stats.clean} hint="Borç bakiyesi yok" />
      </div>

      <div className="ledger-panel-soft p-3 grid grid-cols-1 lg:grid-cols-5 gap-2 items-center">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'ALL' | 'CLEAR' | 'DEBTOR' | 'OVERDUE')}
          className="ledger-input bg-white"
        >
          <option value="ALL">Durum: Hepsi</option>
          <option value="OVERDUE">Durum: Gecikmiş</option>
          <option value="DEBTOR">Durum: Borçlu</option>
          <option value="CLEAR">Durum: Temiz</option>
        </select>
        <select value={blockId} onChange={(e) => setBlockId(e.target.value)} className="ledger-input bg-white">
          <option value="ALL">Blok: Tümü</option>
          {blocks.map((block) => (
            <option key={block.id} value={block.id}>{block.name}</option>
          ))}
        </select>
        <input
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          placeholder="Kat"
          type="number"
          className="ledger-input bg-white"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Daire veya sakin ara..."
          className="ledger-input bg-white lg:col-span-2"
        />
      </div>

      {loading && <p className="text-sm text-[#6b7280]">Yükleniyor...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && !selectedSiteId && (
        <div className="ledger-panel p-5">
          <p className="text-sm text-[#6b7280]">
            {siteError
              ? `Site verisi alınamadı: ${siteError}`
              : 'Aktif bina seçimi bulunamadı. Üst bardan bir bina seçin.'}
          </p>
        </div>
      )}

      {!loading && !error && (
        <div className="ledger-panel overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
            <span className="col-span-2">Daire No</span>
            <span className="col-span-3">Sakin Bilgisi</span>
            <span className="col-span-2">Kat / Blok</span>
            <span className="col-span-2 text-right">Toplam Borç</span>
            <span className="col-span-2">Finansal Durum</span>
            <span className="col-span-1 text-right">Aksiyon</span>
          </div>
          <div className="ledger-divider">
            {units.map((unit) => (
              <div key={unit.id} className="grid grid-cols-12 px-5 py-4 items-center ledger-table-row-hover">
                <div className="col-span-2">
                  <p className="text-sm font-semibold text-[#0c1427]">{unit.number}</p>
                  <p className="text-[11px] text-[#6b7280]">{unit.site.name}</p>
                </div>
                <div className="col-span-3">
                  <p className="text-sm text-[#374151]">
                    {unit.residents.length > 0
                      ? unit.residents.map((r) => `${r.firstName} ${r.lastName}`).join(', ')
                      : 'Sakin kaydı yok'}
                  </p>
                  <p className="text-[11px] text-[#6b7280]">
                    {unit.residents[0]?.type ?? 'Atanmamış'}
                  </p>
                </div>
                <p className="col-span-2 text-sm text-[#6b7280]">
                  Kat {unit.floor ?? '-'} / {unit.block?.name ?? 'Bloksuz'}
                </p>
                <p className={`col-span-2 text-right text-sm tabular-nums font-semibold ${unit.financial.openDebt > 0 ? 'text-[#ba1a1a]' : 'text-[#0c1427]'}`}>
                  {formatTry(unit.financial.openDebt)}
                </p>
                <div className="col-span-2 space-y-1">
                  <StaffStatusPill
                    label={unit.financial.status === 'OVERDUE' ? 'Gecikmiş' : unit.financial.status === 'DEBTOR' ? 'Borçlu' : 'Temiz'}
                    tone={unit.financial.status === 'OVERDUE' ? 'danger' : unit.financial.status === 'DEBTOR' ? 'warning' : 'success'}
                  />
                  <p className="text-[11px] text-[#6b7280]">
                    Son vade: {formatShortDate(unit.financial.nextDueDate)}
                  </p>
                </div>
                <div className="col-span-1 text-right">
                  <Link href={`/work/units/${unit.id}`} className="inline-flex px-3 py-1.5 rounded-md ledger-gradient text-white text-xs font-bold">
                    Detay
                  </Link>
                </div>
              </div>
            ))}
            {units.length === 0 && <p className="px-5 py-6 text-sm text-[#6b7280]">Sonuç bulunamadı.</p>}
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="ledger-panel-soft p-4">
          <p className="text-xs font-bold tracking-[0.16em] uppercase text-[#4f5d6c]">Tahsilat Trendi</p>
          <div className="mt-3 flex items-end gap-2 h-20">
            {stats.trend.map((value, index) => (
              <div
                key={index}
                className={`flex-1 rounded-t-sm ${index === 2 ? 'bg-[#ba1a1a]/80' : index === 1 ? 'bg-[#e69a2f]/70' : 'bg-[#0c1427]/70'}`}
                style={{ height: `${value}%` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
