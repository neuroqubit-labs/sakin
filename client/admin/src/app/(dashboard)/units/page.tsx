'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, Building2, Home, ShieldCheck, Wallet } from 'lucide-react'
import { useApiQuery } from '@/hooks/use-api'
import { useSiteContext } from '@/providers/site-provider'
import { KpiCard, PageHeader, SectionTitle, StatusPill } from '@/components/surface'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { formatShortDate, formatTry } from '@/lib/formatters'

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
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [status, setStatus] = useState<'ALL' | 'CLEAR' | 'DEBTOR' | 'OVERDUE'>('ALL')
  const [blockId, setBlockId] = useState<string>('ALL')
  const [floor, setFloor] = useState<string>('')

  const queryParams = {
    siteId: selectedSiteId ?? undefined,
    page: 1,
    limit: 300,
    isActive: true,
    search: search.trim() || undefined,
    financialStatus: status === 'ALL' ? undefined : status,
    blockId: blockId === 'ALL' ? undefined : blockId,
    floor: floor.trim() ? Number(floor) : undefined,
  }

  const { data: unitsResponse, isLoading } = useApiQuery<UnitsResponse>(
    ['units', queryParams],
    '/units',
    queryParams,
    { enabled: hydrated && !!selectedSiteId },
  )
  const units = unitsResponse?.data ?? []

  const { data: blocksData } = useApiQuery<BlockRow[]>(
    ['blocks', selectedSiteId],
    `/sites/${selectedSiteId}/blocks`,
    undefined,
    { enabled: hydrated && !!selectedSiteId },
  )
  const blocks = blocksData ?? []

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
      <PageHeader
        title="Daire Yönetimi ve Finans"
        eyebrow="Portföy Operasyonu"
        subtitle="Daire operasyonu, sakin bilgisi ve finansal sağlık tek tabloda."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Filtrelenmiş Daire" value={stats.total} hint="Mevcut filtre sonucu" icon={Home} tone="blue" />
        <KpiCard label="Toplam Açık Borç" value={<span className="text-[#ba1a1a]">{formatTry(stats.totalDebt)}</span>} icon={Wallet} tone="navy" />
        <KpiCard label="Borçlu Daire" value={stats.debtor} hint={`${stats.overdue} gecikmiş`} icon={AlertTriangle} tone="amber" />
        <KpiCard label="Temiz Daire" value={stats.clean} hint="Borç bakiyesi yok" icon={ShieldCheck} tone="emerald" />
      </div>

      <div className="ledger-panel-soft p-3 md:p-4">
        <div className="mb-3">
          <p className="ledger-label">Filtreleme</p>
          <p className="mt-1 text-sm text-[#6b7d93]">Durum, blok, kat ve sakin aramasıyla daire listesini daralt.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 items-center">
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
      </div>

      {!hydrated || !selectedSiteId ? (
        <div className="ledger-panel p-5">
          <p className="text-sm text-[#6b7280]">
            {siteError
              ? `Site verisi alınamadı: ${siteError}`
              : 'Aktif bina seçimi bulunamadı. Üst bardan bir bina seçin.'}
          </p>
        </div>
      ) : (
        <div className="ledger-panel overflow-x-auto">
          <SectionTitle title="Daire Listesi" subtitle="Finansal durum, sakin bilgisi ve hızlı erişim tek tabloda." />
          <div className="min-w-[800px]">
          <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
            <span className="col-span-2">Daire No</span>
            <span className="col-span-3">Sakin Bilgisi</span>
            <span className="col-span-2">Kat / Blok</span>
            <span className="col-span-2 text-right">Toplam Borç</span>
            <span className="col-span-2">Finansal Durum</span>
            <span className="col-span-1 text-right">Aksiyon</span>
          </div>
          <div className="ledger-divider">
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 px-5 py-4 gap-3 items-center">
                <Skeleton className="col-span-2 h-10 rounded" />
                <Skeleton className="col-span-3 h-10 rounded" />
                <Skeleton className="col-span-2 h-10 rounded" />
                <Skeleton className="col-span-2 h-10 rounded" />
                <Skeleton className="col-span-2 h-10 rounded" />
                <Skeleton className="col-span-1 h-10 rounded" />
              </div>
            ))}
            {!isLoading && units.map((unit) => (
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
                    {unit.residents[0]?.type === 'OWNER' ? 'Ev Sahibi' : unit.residents[0]?.type === 'TENANT' ? 'Kiracı' : unit.residents[0]?.type === 'CONTACT' ? 'İletişim Kişisi' : 'Atanmamış'}
                  </p>
                </div>
                <p className="col-span-2 text-sm text-[#6b7280]">
                  Kat {unit.floor ?? '-'} / {unit.block?.name ?? 'Bloksuz'}
                </p>
                <p className={`col-span-2 text-right text-sm tabular-nums font-semibold ${unit.financial.openDebt > 0 ? 'text-[#ba1a1a]' : 'text-[#0c1427]'}`}>
                  {formatTry(unit.financial.openDebt)}
                </p>
                <div className="col-span-2 space-y-1">
                  <StatusPill
                    label={unit.financial.status === 'OVERDUE' ? 'Gecikmiş' : unit.financial.status === 'DEBTOR' ? 'Borçlu' : 'Temiz'}
                    tone={unit.financial.status === 'OVERDUE' ? 'danger' : unit.financial.status === 'DEBTOR' ? 'warning' : 'success'}
                  />
                  <p className="text-[11px] text-[#6b7280]">
                    Son vade: {formatShortDate(unit.financial.nextDueDate)}
                  </p>
                </div>
                <div className="col-span-1 text-right">
                  <Link href={`/units/${unit.id}`} className="inline-flex px-3 py-1.5 rounded-md ledger-gradient text-white text-xs font-bold">
                    Detay
                  </Link>
                </div>
              </div>
            ))}
            {!isLoading && units.length === 0 && (
              <EmptyState
                icon={Building2}
                title="Daire bulunamadı"
                description="Bu filtreyle eşleşen daire yok — filtreyi değiştirmeyi deneyin."
              />
            )}
          </div>
          </div>
        </div>
      )}

      {!isLoading && units.length > 0 && (
        <div className="ledger-panel-soft p-4">
          <p className="ledger-label">Tahsilat Trendi</p>
          <p className="mt-1 text-sm text-[#6b7d93]">Temiz, borçlu ve gecikmiş daire dağılımı.</p>
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
