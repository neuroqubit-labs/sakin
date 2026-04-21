'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, Building2, Home, Plus, ShieldCheck, Wallet, ToggleLeft, ToggleRight } from 'lucide-react'
import { useApiQuery } from '@/hooks/use-api'
import { useSiteContext } from '@/providers/site-provider'
import { useAuth } from '@/providers/auth-provider'
import { UnitType, UserRole } from '@sakin/shared'
import { KpiCard, PageHeader, SectionTitle, StatusPill } from '@/components/surface'
import { ScopedBreadcrumb } from '@/components/scoped-breadcrumb'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { apiClient } from '@/lib/api'
import { toastSuccess, toastError } from '@/lib/toast'
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
  meta: { total: number; page: number; limit: number; totalPages: number }
}

interface BlockRow {
  id: string
  name: string
}

export default function WorkUnitsPage() {
  const { selectedSiteId, hydrated, error: siteError } = useSiteContext()
  const { role } = useAuth()
  const isTenantAdmin = role === UserRole.TENANT_ADMIN
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [committedSearch, setCommittedSearch] = useState(searchParams.get('q') ?? '')
  const [status, setStatus] = useState<'ALL' | 'CLEAR' | 'DEBTOR' | 'OVERDUE'>('ALL')
  const [blockId, setBlockId] = useState<string>('ALL')
  const [floor, setFloor] = useState<string>('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const queryParams = {
    siteId: selectedSiteId ?? undefined,
    page,
    limit: 20,
    isActive: true,
    search: committedSearch.trim() || undefined,
    financialStatus: status === 'ALL' ? undefined : status,
    blockId: blockId === 'ALL' ? undefined : blockId,
    floor: floor.trim() ? Number(floor) : undefined,
  }

  const { data: unitsResponse, isLoading, error: unitsError, refetch } = useApiQuery<UnitsResponse>(
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

  const { data: siteDetail, refetch: refetchSite } = useApiQuery<{
    totalUnits: number
    units: Array<{ id: string }>
  }>(
    ['site-detail', selectedSiteId],
    `/sites/${selectedSiteId}`,
    undefined,
    { enabled: hydrated && !!selectedSiteId },
  )
  const siteCapacity = siteDetail?.totalUnits ?? 0
  const siteUnitCount = siteDetail?.units?.length ?? 0
  const capacityRemaining = Math.max(0, siteCapacity - siteUnitCount)
  const capacityFull = siteCapacity > 0 && capacityRemaining === 0

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    const allIds = units.map((u) => u.id)
    const allSelected = allIds.every((id) => selectedSet.has(id))
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !allIds.includes(id)))
    } else {
      setSelected((prev) => Array.from(new Set([...prev, ...allIds])))
    }
  }

  const bulkToggleActive = async (activate: boolean) => {
    if (selected.length === 0) return
    setBulkLoading(true)
    try {
      await Promise.all(
        selected.map((id) =>
          activate
            ? apiClient(`/units/${id}/activate`, { method: 'POST' })
            : apiClient(`/units/${id}`, { method: 'DELETE' }),
        ),
      )
      toastSuccess(`${selected.length} daire ${activate ? 'aktifleştirildi' : 'pasife alındı'}`)
      setSelected([])
      void refetch()
    } catch (err) {
      toastError(err instanceof Error ? err : 'Toplu işlem başarısız')
    } finally {
      setBulkLoading(false)
    }
  }

  const stats = useMemo(() => {
    const total = unitsResponse?.meta?.total ?? units.length
    const clean = units.filter((unit) => unit.financial.status === 'CLEAR').length
    const debtor = units.filter((unit) => unit.financial.status === 'DEBTOR').length
    const overdue = units.filter((unit) => unit.financial.status === 'OVERDUE').length
    const totalDebt = units.reduce((sum, unit) => sum + unit.financial.openDebt, 0)

    return { total, clean, debtor, overdue, totalDebt }
  }, [units, unitsResponse?.meta?.total])

  return (
    <div className="space-y-6">
      <ScopedBreadcrumb module="Daireler" />
      <PageHeader
        title="Daire Yönetimi ve Finans"
        eyebrow="Portföy Operasyonu"
        subtitle="Daire operasyonu, sakin bilgisi ve finansal sağlık tek tabloda."
        actions={
          isTenantAdmin ? (
            <div className="flex flex-col items-end gap-1">
              <Button
                type="button"
                onClick={() => setCreateOpen(true)}
                disabled={!selectedSiteId || capacityFull}
                title={capacityFull ? `Kapasite dolu (${siteCapacity} daire). Site bilgisinden toplam daire sayısını artırın.` : undefined}
              >
                <Plus className="h-4 w-4" />
                Daire Ekle
              </Button>
              {selectedSiteId && siteCapacity > 0 ? (
                <span className={`text-[11px] ${capacityFull ? 'text-[#ba1a1a]' : 'text-[#6b7280]'}`}>
                  {siteUnitCount} / {siteCapacity} daire
                  {capacityFull ? ' — kapasite dolu' : ` · ${capacityRemaining} kalan`}
                </span>
              ) : null}
            </div>
          ) : undefined
        }
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
          onChange={(e) => { setStatus(e.target.value as 'ALL' | 'CLEAR' | 'DEBTOR' | 'OVERDUE'); setPage(1) }}
          className="ledger-input bg-white"
        >
          <option value="ALL">Durum: Hepsi</option>
          <option value="OVERDUE">Durum: Gecikmiş</option>
          <option value="DEBTOR">Durum: Borçlu</option>
          <option value="CLEAR">Durum: Temiz</option>
        </select>
        <select value={blockId} onChange={(e) => { setBlockId(e.target.value); setPage(1) }} className="ledger-input bg-white">
          <option value="ALL">Blok: Tümü</option>
          {blocks.map((block) => (
            <option key={block.id} value={block.id}>{block.name}</option>
          ))}
        </select>
        <input
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') setPage(1) }}
          placeholder="Kat"
          type="number"
          className="ledger-input bg-white"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setCommittedSearch(search); setPage(1) } }}
          placeholder="Daire veya sakin ara..."
          className="ledger-input bg-white"
        />
        <Button type="button" onClick={() => { setCommittedSearch(search); setPage(1) }}>
          Filtrele
        </Button>
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
      ) : unitsError ? (
        <div className="ledger-panel p-5">
          <p className="text-sm text-red-600">
            Daire listesi yüklenemedi: {unitsError.message}
          </p>
        </div>
      ) : (
        <>
        {isTenantAdmin && selected.length > 0 && (
          <div className="flex items-center gap-3 rounded-[22px] border border-[#dce7f6] bg-[#f7faff] px-4 py-3 text-sm">
            <span className="font-semibold text-[#17345a]">{selected.length} daire seçili</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={bulkLoading}
              onClick={() => void bulkToggleActive(false)}
            >
              <ToggleLeft className="h-4 w-4" />
              Pasife Al
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={bulkLoading}
              onClick={() => void bulkToggleActive(true)}
            >
              <ToggleRight className="h-4 w-4" />
              Aktifleştir
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSelected([])}
            >
              Seçimi Temizle
            </Button>
          </div>
        )}

        <div className="ledger-panel overflow-x-auto">
          <SectionTitle title="Daire Listesi" subtitle="Finansal durum, sakin bilgisi ve hızlı erişim tek tabloda." />
          <div className="min-w-[800px]">
          <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
            {isTenantAdmin && (
              <span className="col-span-1">
                <input
                  type="checkbox"
                  checked={units.length > 0 && units.every((u) => selectedSet.has(u.id))}
                  onChange={toggleSelectAll}
                />
              </span>
            )}
            <span className={isTenantAdmin ? 'col-span-2' : 'col-span-2'}>Daire No</span>
            <span className={isTenantAdmin ? 'col-span-2' : 'col-span-3'}>Sakin Bilgisi</span>
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
                {isTenantAdmin && (
                  <span className="col-span-1">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(unit.id)}
                      onChange={() => toggleSelect(unit.id)}
                    />
                  </span>
                )}
                <div className="col-span-2">
                  <p className="text-sm font-semibold text-[#0c1427]">{unit.number}</p>
                  <p className="text-[11px] text-[#6b7280]">{unit.site.name}</p>
                </div>
                <div className={isTenantAdmin ? 'col-span-2' : 'col-span-3'}>
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
        </>
      )}

      {createOpen && selectedSiteId && (
        <CreateUnitDialog
          siteId={selectedSiteId}
          blocks={blocks}
          capacityRemaining={capacityRemaining}
          siteCapacity={siteCapacity}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            void refetch()
            void refetchSite()
          }}
        />
      )}

      {unitsResponse?.meta && (
        <div className="flex items-center justify-between rounded-[22px] border border-white/80 bg-white/74 px-4 py-3 text-xs text-[#6b7280] shadow-[0_14px_30px_rgba(8,17,31,0.04)]">
          <span>
            Toplam {unitsResponse.meta.total} daire • Sayfa {unitsResponse.meta.page}/{Math.max(unitsResponse.meta.totalPages, 1)}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={unitsResponse.meta.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Önceki
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={unitsResponse.meta.page >= unitsResponse.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}

const UNIT_TYPE_OPTIONS: Array<{ value: UnitType; label: string }> = [
  { value: UnitType.APARTMENT, label: 'Daire' },
  { value: UnitType.DUPLEX, label: 'Dubleks' },
  { value: UnitType.PENTHOUSE, label: 'Penthouse' },
  { value: UnitType.GARDEN_FLOOR, label: 'Bahçe Katı' },
  { value: UnitType.COMMERCIAL, label: 'Dükkan' },
  { value: UnitType.OFFICE, label: 'Ofis' },
  { value: UnitType.STORAGE, label: 'Depo' },
  { value: UnitType.PARKING, label: 'Otopark' },
]

interface CreateUnitDialogProps {
  siteId: string
  blocks: BlockRow[]
  capacityRemaining: number
  siteCapacity: number
  onClose: () => void
  onCreated: () => void
}

function CreateUnitDialog({ siteId, blocks, capacityRemaining, siteCapacity, onClose, onCreated }: CreateUnitDialogProps) {
  const [number, setNumber] = useState('')
  const [blockId, setBlockId] = useState<string>('')
  const [floor, setFloor] = useState<string>('')
  const [type, setType] = useState<UnitType>(UnitType.APARTMENT)
  const [area, setArea] = useState<string>('')
  const [description, setDescription] = useState('')
  const [isStaffQuarters, setIsStaffQuarters] = useState(false)
  const [isExemptFromDues, setIsExemptFromDues] = useState(false)
  const [customDuesAmount, setCustomDuesAmount] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!number.trim()) {
      setError('Daire numarası zorunludur.')
      return
    }
    if (capacityRemaining <= 0) {
      setError(`Site kapasitesi dolu (${siteCapacity} daire). Önce site bilgisinden toplam daire sayısını artırın.`)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await apiClient('/units', {
        method: 'POST',
        body: JSON.stringify({
          siteId,
          number: number.trim(),
          blockId: blockId || undefined,
          floor: floor.trim() ? Number(floor) : undefined,
          type,
          area: area.trim() ? Number(area) : undefined,
          description: description.trim() || undefined,
          isStaffQuarters: isStaffQuarters || undefined,
          isExemptFromDues: isExemptFromDues || undefined,
          customDuesAmount: customDuesAmount.trim() ? Number(customDuesAmount) : undefined,
        }),
      })
      toastSuccess(`Daire ${number.trim()} eklendi`)
      onCreated()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Daire oluşturulamadı'
      setError(message)
      toastError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onClose={() => { if (!submitting) onClose() }}>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Yeni Daire Ekle</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          {siteCapacity > 0 ? (
            <div className={`rounded-xl border px-3 py-2 text-xs ${capacityRemaining <= 0 ? 'border-[#f3c0c0] bg-[#fff4f4] text-[#ba1a1a]' : 'border-[#dce7f6] bg-[#f7faff] text-[#17345a]'}`}>
              Site kapasitesi: {siteCapacity} daire · Kalan: {capacityRemaining}
              {capacityRemaining <= 0 ? ' — kapasite dolu, önce site bilgisinden artırın.' : ''}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#4e5d6d]">Daire No *</label>
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="ledger-input w-full bg-white"
                placeholder="Ör: 12"
                maxLength={20}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#4e5d6d]">Kat</label>
              <input
                type="number"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="ledger-input w-full bg-white"
                placeholder="Ör: 3"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#4e5d6d]">Blok</label>
              <select
                value={blockId}
                onChange={(e) => setBlockId(e.target.value)}
                className="ledger-input w-full bg-white"
              >
                <option value="">Bloksuz</option>
                {blocks.map((block) => (
                  <option key={block.id} value={block.id}>{block.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#4e5d6d]">Tip</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as UnitType)}
                className="ledger-input w-full bg-white"
              >
                {UNIT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#4e5d6d]">Alan (m²)</label>
              <input
                type="number"
                step="0.01"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="ledger-input w-full bg-white"
                placeholder="Ör: 120"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#4e5d6d]">Özel Aidat (₺)</label>
              <input
                type="number"
                step="0.01"
                value={customDuesAmount}
                onChange={(e) => setCustomDuesAmount(e.target.value)}
                className="ledger-input w-full bg-white"
                placeholder="Boş → site geneli"
                disabled={isExemptFromDues}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#4e5d6d]">Açıklama</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="ledger-input w-full bg-white"
              rows={2}
              maxLength={500}
            />
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-[#374151]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isStaffQuarters}
                onChange={(e) => setIsStaffQuarters(e.target.checked)}
              />
              Personel dairesi
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isExemptFromDues}
                onChange={(e) => setIsExemptFromDues(e.target.checked)}
              />
              Aidattan muaf
            </label>
          </div>
          {error ? <p className="text-sm text-[#ba1a1a]">{error}</p> : null}
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Vazgeç
          </Button>
          <Button type="submit" disabled={submitting || capacityRemaining <= 0}>
            {submitting ? 'Kaydediliyor...' : 'Daireyi Ekle'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
