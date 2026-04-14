'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CreateUnitSchema,
  CreateBlockSchema,
  type CreateUnitDto,
  type CreateBlockDto,
  UnitType,
} from '@sakin/shared'
import { AlertCircle, Building2, ChevronRight, Home, Layers, Plus, Users } from 'lucide-react'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { toastSuccess } from '@/lib/toast'
import { Breadcrumb } from '@/components/breadcrumb'
import { EmptyState } from '@/components/empty-state'
import { KpiCard, PageHeader, SectionTitle } from '@/components/surface'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

interface SiteDetail {
  id: string
  name: string
  address: string
  city: string
  district: string | null
  totalUnits: number
  hasBlocks: boolean
  isActive: boolean
}

interface UnitRow {
  id: string
  number: string
  floor: number | null
  type: string
  block: { name: string } | null
  residents: Array<{ id: string; firstName: string; lastName: string; type: string }>
  financial: { status: 'CLEAR' | 'DEBTOR' | 'OVERDUE' }
}

interface BlockRow {
  id: string
  name: string
  totalUnits: number
  _count: { units: number }
}

interface UnitsResponse {
  data: UnitRow[]
  meta: { total: number }
}

const UNIT_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Daire',
  COMMERCIAL: 'Dükkan',
  STORAGE: 'Depo',
  PARKING: 'Otopark',
  GARDEN_FLOOR: 'Bahçe Kat',
  PENTHOUSE: 'Çatı Katı',
  DUPLEX: 'Dubleks',
  OFFICE: 'Ofis',
}

function financialChip(status: 'CLEAR' | 'DEBTOR' | 'OVERDUE') {
  if (status === 'CLEAR') return <span className="ledger-chip ledger-chip-success">Temiz</span>
  if (status === 'DEBTOR') return <span className="ledger-chip ledger-chip-warning">Borçlu</span>
  return <span className="ledger-chip ledger-chip-danger">Gecikmiş</span>
}

export default function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [showAddUnit, setShowAddUnit] = useState(false)
  const [showAddBlock, setShowAddBlock] = useState(false)

  const { data: site, isLoading: siteLoading } = useApiQuery<SiteDetail>(
    ['site-detail', id],
    `/sites/${id}`,
  )

  const { data: unitsRes, isLoading: unitsLoading } = useApiQuery<UnitsResponse>(
    ['site-units', id],
    '/units',
    { siteId: id, limit: 200 },
    { enabled: !!id },
  )
  const units = unitsRes?.data ?? []

  const { data: blocks = [] } = useApiQuery<BlockRow[]>(
    ['site-blocks', id],
    `/sites/${id}/blocks`,
    undefined,
    { enabled: !!id && site?.hasBlocks === true },
  )

  const addUnitMutation = useApiMutation<UnitRow, CreateUnitDto>('/units', {
    invalidateKeys: [['site-units', id]],
    onSuccess: () => {
      toastSuccess('Daire eklendi.')
      setShowAddUnit(false)
      unitForm.reset({ siteId: id, number: '', type: UnitType.APARTMENT })
    },
  })

  const addBlockMutation = useApiMutation<BlockRow, CreateBlockDto & { siteId: string }>(
    `/sites/${id}/blocks`,
    {
      invalidateKeys: [['site-blocks', id]],
      onSuccess: () => {
        toastSuccess('Blok eklendi.')
        setShowAddBlock(false)
        blockForm.reset()
      },
    },
  )

  const unitForm = useForm<CreateUnitDto>({
    resolver: zodResolver(CreateUnitSchema),
    defaultValues: { siteId: id, number: '', type: UnitType.APARTMENT },
  })

  const blockForm = useForm<CreateBlockDto>({
    resolver: zodResolver(CreateBlockSchema),
    defaultValues: { name: '', totalUnits: 1 },
  })

  const unassignedCount = units.filter((u) => u.residents.length === 0).length

  return (
    <div className="space-y-6 motion-in">
      <Breadcrumb items={[{ label: 'Siteler', href: '/sites' }, { label: site?.name ?? '…' }]} />

      <PageHeader
        title={siteLoading ? '...' : (site?.name ?? '')}
        eyebrow="Site Detayı"
        subtitle={site ? `${site.address} · ${site.city}${site.district ? ` / ${site.district}` : ''}` : 'Site kaydı yükleniyor.'}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAddUnit((prev) => !prev)}>
              <Plus className="h-4 w-4" />
              Daire Ekle
            </Button>
            {site?.hasBlocks ? (
              <Button size="sm" onClick={() => setShowAddBlock((prev) => !prev)}>
                <Plus className="h-4 w-4" />
                Blok Ekle
              </Button>
            ) : null}
          </div>
        )}
      />

      <div className="motion-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {siteLoading || unitsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ledger-panel p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))
        ) : (
          <>
            <KpiCard label="Planlanan Daire" value={site?.totalUnits ?? 0} hint="Site kayıt hedefi." icon={Building2} tone="blue" />
            <KpiCard label="Tanımlı Daire" value={units.length} hint="Sistem üzerinde açılmış bağımsız bölüm." icon={Home} tone="navy" />
            <KpiCard label="Sakin Ataması Yok" value={unassignedCount} hint="Henüz sakini ilişkilendirilmemiş daire." icon={Users} tone="amber" />
            <KpiCard
              label={site?.hasBlocks ? 'Blok Sayısı' : 'Site Durumu'}
              value={site?.hasBlocks ? blocks.length : (site?.isActive ? 'Aktif' : 'Arşiv')}
              hint={site?.hasBlocks ? 'Blok bazlı organizasyon kapsamı.' : 'İşlem almaya açık operasyon durumu.'}
              icon={site?.hasBlocks ? Layers : Building2}
              tone={site?.hasBlocks ? 'cyan' : site?.isActive ? 'emerald' : 'rose'}
            />
          </>
        )}
      </div>

      <div className="ledger-panel overflow-hidden">
        <SectionTitle
          title="Daireler"
          subtitle="Siteye bağlı daireler, sakin ataması ve finansal durum görünümü."
          actions={(
            <Button size="sm" variant="outline" onClick={() => setShowAddUnit((prev) => !prev)}>
              <Plus className="h-4 w-4" />
              Daire Ekle
            </Button>
          )}
        />

        {showAddUnit ? (
          <div className="p-5 border-b border-white/70">
            <div className="ledger-panel-soft p-4 md:p-5">
              <Form {...unitForm}>
                <form
                  onSubmit={unitForm.handleSubmit((data) => addUnitMutation.mutate(data))}
                  className="grid grid-cols-1 gap-3 md:grid-cols-4"
                >
                  <FormField
                    control={unitForm.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daire No</FormLabel>
                        <FormControl>
                          <Input placeholder="1, 2A, B-12..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={unitForm.control}
                    name="floor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kat</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={unitForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tip</FormLabel>
                        <FormControl>
                          <select {...field} className="ledger-input bg-white w-full h-10">
                            {Object.entries(UNIT_TYPE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={unitForm.control}
                    name="area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alan m²</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="85"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {site?.hasBlocks && blocks.length > 0 ? (
                    <FormField
                      control={unitForm.control}
                      name="blockId"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Blok</FormLabel>
                          <FormControl>
                            <select {...field} className="ledger-input bg-white w-full h-10">
                              <option value="">Blok seçin</option>
                              {blocks.map((block) => (
                                <option key={block.id} value={block.id}>{block.name}</option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                  <div className="md:col-span-4 flex flex-wrap gap-2 pt-1">
                    <Button type="submit" disabled={addUnitMutation.isPending}>
                      {addUnitMutation.isPending ? 'Kaydediliyor...' : 'Daire Ekle'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddUnit(false)}>
                      İptal
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        ) : null}

        <div className="min-w-[640px]">
          <div className="grid grid-cols-12 px-5 py-3 ledger-table-head text-xs">
            <span className="col-span-2">Daire No</span>
            <span className="col-span-1">Kat</span>
            <span className="col-span-2">Blok / Tip</span>
            <span className="col-span-4">Sakin</span>
            <span className="col-span-2">Durum</span>
            <span className="col-span-1 text-right">Detay</span>
          </div>
          <div className="ledger-divider overflow-x-auto">
            {unitsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-12 px-5 py-3 gap-3 items-center">
                  <Skeleton className="col-span-2 h-10 rounded-2xl" />
                  <Skeleton className="col-span-1 h-10 rounded-2xl" />
                  <Skeleton className="col-span-2 h-10 rounded-2xl" />
                  <Skeleton className="col-span-4 h-10 rounded-2xl" />
                  <Skeleton className="col-span-2 h-10 rounded-2xl" />
                  <Skeleton className="col-span-1 h-10 rounded-2xl" />
                </div>
              ))
            ) : units.length === 0 ? (
              <EmptyState
                icon={Home}
                title="Henüz daire kaydı yok"
                description="İlk daireyi ekleyerek bu siteyi operasyon akışına dahil edin."
                actionLabel="Daire Ekle"
                onAction={() => setShowAddUnit(true)}
              />
            ) : (
              units.map((unit) => (
                <div key={unit.id} className="grid grid-cols-12 px-5 py-4 items-center ledger-table-row-hover">
                  <p className="col-span-2 text-sm font-bold text-[#0c1427] tabular-nums">{unit.number}</p>
                  <p className="col-span-1 text-sm text-[#6b7280] tabular-nums">{unit.floor ?? '—'}</p>
                  <div className="col-span-2">
                    {unit.block ? <p className="text-xs font-semibold text-[#374151]">{unit.block.name}</p> : null}
                    <p className="text-xs text-[#9ca3af]">{UNIT_TYPE_LABELS[unit.type] ?? unit.type}</p>
                  </div>
                  <div className="col-span-4">
                    {unit.residents.length === 0 ? (
                      <span className="text-xs italic text-[#9ca3af]">Sakin ataması yok</span>
                    ) : (
                      <div className="space-y-0.5">
                        {unit.residents.slice(0, 2).map((resident) => (
                          <p key={resident.id} className="text-xs text-[#374151]">
                            {resident.firstName} {resident.lastName}
                          </p>
                        ))}
                        {unit.residents.length > 2 ? (
                          <p className="text-[11px] text-[#9ca3af]">+{unit.residents.length - 2} kişi daha</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2">{financialChip(unit.financial.status)}</div>
                  <div className="col-span-1 flex justify-end">
                    <Link
                      href={`/units/${unit.id}`}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-xl text-[#7b8ba1] transition-colors hover:bg-white hover:text-[#0d182b]"
                      aria-label={`Daire ${unit.number} detayı`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {site?.hasBlocks ? (
        <div className="ledger-panel overflow-hidden">
          <SectionTitle
            title="Bloklar"
            subtitle="Blok bazlı kapasite planı ve gerçekleşen daire sayısı."
            actions={(
              <Button size="sm" variant="outline" onClick={() => setShowAddBlock((prev) => !prev)}>
                <Plus className="h-4 w-4" />
                Blok Ekle
              </Button>
            )}
          />

          {showAddBlock ? (
            <div className="p-5 border-b border-white/70">
              <div className="ledger-panel-soft p-4 md:p-5">
                <Form {...blockForm}>
                  <form
                    onSubmit={blockForm.handleSubmit((data) => addBlockMutation.mutate({ ...data, siteId: id }))}
                    className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]"
                  >
                    <FormField
                      control={blockForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blok Adı</FormLabel>
                          <FormControl><Input placeholder="A Blok" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={blockForm.control}
                      name="totalUnits"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Daire Sayısı</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-wrap items-end gap-2">
                      <Button type="submit" disabled={addBlockMutation.isPending}>
                        {addBlockMutation.isPending ? 'Kaydediliyor...' : 'Ekle'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowAddBlock(false)}>
                        İptal
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          ) : null}

          <div className="ledger-divider">
            {blocks.length === 0 && !showAddBlock ? (
              <EmptyState
                icon={Layers}
                title="Henüz blok kaydı yok"
                description="Çok bloklu yapı yönetimi için ilk bloğu ekleyin."
                actionLabel="Blok Ekle"
                onAction={() => setShowAddBlock(true)}
              />
            ) : (
              blocks.map((block) => (
                <div key={block.id} className="flex items-center justify-between px-5 py-4 ledger-table-row-hover">
                  <div>
                    <p className="text-sm font-semibold text-[#0c1427]">{block.name}</p>
                    <p className="text-xs text-[#9ca3af]">{block._count.units} / {block.totalUnits} daire</p>
                  </div>
                  <span className="ledger-chip ledger-chip-neutral">{block.totalUnits} planlı</span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {!siteLoading && site && !site.isActive ? (
        <div role="alert" className="flex items-center gap-2 rounded-[22px] bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Bu site arşivlenmiş. Yeni işlem eklemek için önce kaydı yeniden aktifleştirin.
        </div>
      ) : null}
    </div>
  )
}
