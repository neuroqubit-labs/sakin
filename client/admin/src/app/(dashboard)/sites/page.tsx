'use client'

import { useMemo, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateSiteSchema, type CreateSiteDto, type UpdateSiteDto } from '@sakin/shared'
import Link from 'next/link'
import {
  Archive,
  Building2,
  ChevronRight,
  Home,
  MapPinned,
  Pencil,
  Plus,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { useSiteContext } from '@/providers/site-provider'
import { toastSuccess } from '@/lib/toast'
import { formatTry, riskLabel, riskTone } from '@/lib/formatters'
import { EmptyState } from '@/components/empty-state'
import { KpiCard, PageHeader, SectionTitle, StatusPill } from '@/components/surface'
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

interface SiteRow {
  id: string
  name: string
  address: string
  city: string
  district: string | null
  totalUnits: number
  hasBlocks: boolean
  isActive: boolean
  _count: { units: number }
}

interface PortfolioRow {
  id: string
  collectionRate: number
  thisMonthCollection: number
  totalDebt: number
  overdueUnits: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

function SiteFormFields({
  mode,
  pending,
  onCancel,
  form,
}: {
  mode: 'create' | 'edit'
  pending: boolean
  onCancel: () => void
  form: UseFormReturn<CreateSiteDto | UpdateSiteDto>
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Site Adı</FormLabel>
              <FormControl><Input placeholder="Güneş Apartmanı" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Şehir</FormLabel>
              <FormControl><Input placeholder="Kayseri" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="district"
          render={({ field }) => (
            <FormItem>
              <FormLabel>İlçe</FormLabel>
              <FormControl><Input placeholder="Melikgazi" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adres</FormLabel>
              <FormControl><Input placeholder="Cumhuriyet Mah. 123 Sok. No:4" {...field} value={field.value ?? ''} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="totalUnits"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Toplam Daire</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  {...field}
                  value={field.value ?? 1}
                  onChange={(e) => field.onChange(Number(e.target.value) || 1)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="hasBlocks"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3 rounded-[20px] border border-white/80 bg-white/76 px-4 py-3 shadow-[0_14px_30px_rgba(8,17,31,0.04)] md:mt-6">
              <FormControl>
                <input
                  type="checkbox"
                  checked={!!field.value}
                  onChange={field.onChange}
                  className="h-4 w-4 rounded border border-[#bfd0ec] text-[#1d3b67]"
                />
              </FormControl>
              <div>
                <FormLabel className="!mt-0">Bloklu yapı</FormLabel>
                <p className="mt-1 text-xs leading-5 text-[#72839b]">
                  {mode === 'create'
                    ? 'Çok bloklu yapı yönetimi için blok kaydını hazırlar.'
                    : 'Bu site için blok bazlı yerleşim yapısı aktif olur.'}
                </p>
              </div>
            </FormItem>
          )}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-6">
        <Button type="submit" disabled={pending}>
          {pending ? 'Kaydediliyor...' : mode === 'create' ? 'Site Ekle' : 'Kaydet'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          İptal
        </Button>
      </div>
    </>
  )
}

export default function SitesPage() {
  const { selectedSiteId, setSelectedSiteId } = useSiteContext()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: sites = [], isLoading: sitesLoading } = useApiQuery<SiteRow[]>(
    ['sites'],
    '/sites',
    { includeInactive: true },
  )

  const { data: portfolioRows = [] } = useApiQuery<PortfolioRow[]>(
    ['portfolio'],
    '/tenant/work-portfolio',
  )

  const portfolioById = useMemo(() => {
    const map = new Map<string, PortfolioRow>()
    portfolioRows.forEach((row) => map.set(row.id, row))
    return map
  }, [portfolioRows])

  const stats = useMemo(() => {
    const totalSites = sites.length
    const activeSites = sites.filter((s) => s.isActive).length
    const totalUnits = sites.reduce((sum, s) => sum + s._count.units, 0)
    const highRiskCount = portfolioRows.filter((r) => r.riskLevel === 'HIGH').length

    return {
      totalSites,
      activeSites,
      archivedSites: totalSites - activeSites,
      totalUnits,
      highRiskCount,
    }
  }, [sites, portfolioRows])

  const createMutation = useApiMutation<SiteRow, CreateSiteDto>('/sites', {
    invalidateKeys: [['sites'], ['portfolio']],
    onSuccess: () => {
      toastSuccess('Site oluşturuldu')
      setShowCreate(false)
      createForm.reset({
        name: '',
        address: '',
        city: '',
        district: '',
        totalUnits: 1,
        hasBlocks: false,
      })
    },
  })

  const updateMutation = useApiMutation<SiteRow, UpdateSiteDto & { id: string }>(
    (vars) => `/sites/${vars.id}`,
    {
      method: 'PATCH',
      invalidateKeys: [['sites'], ['portfolio']],
      onSuccess: () => {
        toastSuccess('Site güncellendi')
        setEditingId(null)
      },
    },
  )

  const archiveMutation = useApiMutation<SiteRow, { id: string; isActive: boolean }>(
    (vars) => `/sites/${vars.id}`,
    {
      method: 'PATCH',
      invalidateKeys: [['sites'], ['portfolio']],
      onSuccess: (_, vars) => {
        toastSuccess(vars.isActive ? 'Site aktifleştirildi' : 'Site arşivlendi')
      },
    },
  )

  const createForm = useForm<CreateSiteDto>({
    resolver: zodResolver(CreateSiteSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      district: '',
      totalUnits: 1,
      hasBlocks: false,
    },
  })

  const editForm = useForm<UpdateSiteDto>({
    resolver: zodResolver(CreateSiteSchema.partial()),
  })

  const startEdit = (site: SiteRow) => {
    setEditingId(site.id)
    editForm.reset({
      name: site.name,
      address: site.address,
      city: site.city,
      district: site.district ?? '',
      totalUnits: site.totalUnits,
      hasBlocks: site.hasBlocks,
    })
  }

  return (
    <div className="space-y-6 motion-in">
      <PageHeader
        title="Siteler"
        eyebrow="Portföy Yönetimi"
        subtitle="Bina kayıtlarını, tahsilat riskini ve operasyon kapsamını tek bakışta yönetin."
        actions={(
          <Button
            size="sm"
            onClick={() => {
              setEditingId(null)
              setShowCreate((prev) => !prev)
            }}
          >
            <Plus className="h-4 w-4" />
            Yeni Site
          </Button>
        )}
      />

      {sitesLoading ? (
        <div className="motion-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="ledger-panel p-5 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Toplam Site" value={stats.totalSites} hint="Portföyde kayıtlı yapı adedi." icon={Building2} tone="blue" />
          <KpiCard
            label="Aktif Site"
            value={stats.activeSites}
            hint="Operasyona açık portföyler."
            railPercent={stats.totalSites ? (stats.activeSites / stats.totalSites) * 100 : 0}
            icon={MapPinned}
            tone="emerald"
          />
          <KpiCard
            label="Arşiv Site"
            value={stats.archivedSites}
            hint="Bekleyen veya pasife alınmış kayıtlar."
            railPercent={stats.totalSites ? (stats.archivedSites / stats.totalSites) * 100 : 0}
            icon={Archive}
            tone="amber"
          />
          <KpiCard label="Toplam Daire" value={stats.totalUnits} hint="Site bazında tanımlı bağımsız bölüm." icon={Home} tone="navy" />
          <KpiCard label="Yüksek Riskli" value={stats.highRiskCount} hint="Borç ve gecikme tarafında yakın takip isteyen site." icon={ShieldAlert} tone="rose" />
        </div>
      )}

      {showCreate && (
        <div className="ledger-panel overflow-hidden">
          <SectionTitle
            title="Yeni site oluştur"
            subtitle="Temel bina kaydını oluşturun; blok yapısı ve daire kapasitesi bu aşamada tanımlansın."
          />
          <div className="p-5">
            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="ledger-panel-soft p-4 md:p-5">
                  <div className="mb-4">
                    <p className="ledger-label">Site Bilgileri</p>
                    <p className="mt-1 text-sm text-[#6f8098]">
                      Kayıt tamamlandığında daire, sakin ve aidat akışları bu portföy üzerinden çalışır.
                    </p>
                  </div>
                  <SiteFormFields
                    mode="create"
                    pending={createMutation.isPending}
                    onCancel={() => setShowCreate(false)}
                    form={createForm as UseFormReturn<CreateSiteDto | UpdateSiteDto>}
                  />
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}

      <div className="ledger-panel overflow-hidden">
        <SectionTitle
          title="Site portföyü"
          subtitle="Tahsilat görünümü, borç yükü ve işlem durumuyla birlikte tüm binalar."
        />
        <div className="grid grid-cols-12 px-5 py-3 ledger-table-head text-xs">
          <span className="col-span-3">Site</span>
          <span className="col-span-1 text-center">Daire</span>
          <span className="col-span-2 text-right">Aylık Tahsilat</span>
          <span className="col-span-2 text-right">Toplam Borç</span>
          <span className="col-span-2">Risk / Durum</span>
          <span className="col-span-2 text-right">Aksiyon</span>
        </div>
        <div className="ledger-divider">
          {sitesLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-4">
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          ))}

          {!sitesLoading && sites.length === 0 && (
            <EmptyState
              icon={Building2}
              title="Henüz kayıtlı site yok"
              description="İlk portföy kaydını ekleyerek daire, sakin ve tahsilat operasyonunu başlatın."
              actionLabel="İlk Siteyi Ekle"
              onAction={() => setShowCreate(true)}
            />
          )}

          {!sitesLoading && sites.map((site) => {
            const portfolio = portfolioById.get(site.id)

            return (
              <div key={site.id} className="grid grid-cols-12 px-5 py-4 items-center ledger-table-row-hover">
                <div className="col-span-3 min-w-0">
                  <Link
                    href={`/sites/${site.id}`}
                    className="inline-flex max-w-full items-center gap-2 text-sm font-semibold text-[#0c1427] transition-colors hover:text-[#274c84]"
                  >
                    <span className="truncate">{site.name}</span>
                    {selectedSiteId === site.id ? <span className="ledger-chip ledger-chip-neutral">Seçili</span> : null}
                  </Link>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    {site.city}
                    {site.district ? ` / ${site.district}` : ''}
                  </p>
                </div>

                <p className="col-span-1 text-center text-sm font-semibold tabular-nums text-[#0c1427]">
                  {site._count.units}
                </p>

                <p className="col-span-2 text-right text-sm tabular-nums text-[#0c1427]">
                  {portfolio ? formatTry(portfolio.thisMonthCollection) : '-'}
                </p>

                <p className="col-span-2 text-right text-sm tabular-nums text-[#0c1427]">
                  {portfolio ? formatTry(portfolio.totalDebt) : '-'}
                </p>

                <div className="col-span-2 flex flex-wrap items-center gap-2">
                  {portfolio ? (
                    <StatusPill label={riskLabel(portfolio.riskLevel)} tone={riskTone(portfolio.riskLevel)} />
                  ) : (
                    <span className="ledger-chip ledger-chip-neutral">Metrik Yok</span>
                  )}
                  <span className={site.isActive ? 'ledger-chip ledger-chip-success' : 'ledger-chip ledger-chip-neutral'}>
                    {site.isActive ? 'AKTİF' : 'ARŞİV'}
                  </span>
                </div>

                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant={selectedSiteId === site.id ? 'default' : 'outline'}
                    className="h-8 text-xs"
                    onClick={() => setSelectedSiteId(site.id)}
                  >
                    {selectedSiteId === site.id ? 'Seçili' : 'Seç'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEdit(site)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    disabled={archiveMutation.isPending}
                    onClick={() => archiveMutation.mutate({ id: site.id, isActive: !site.isActive })}
                  >
                    {site.isActive ? (
                      <Archive className="h-3.5 w-3.5 text-[#ba1a1a]" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5 text-[#0e7a52]" />
                    )}
                  </Button>
                  <Link
                    href={`/sites/${site.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-[#7b8ba1] transition-colors hover:bg-white hover:text-[#0d182b]"
                    aria-label={`${site.name} detay`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {editingId && (
        <div className="ledger-panel overflow-hidden">
          <SectionTitle
            title="Site kaydını düzenle"
            subtitle="Adres, kapasite ve blok yapısı bilgilerini operasyonu bozmadan güncelleyin."
          />
          <div className="p-5">
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ ...data, id: editingId }))}
                className="space-y-4"
              >
                <div className="ledger-panel-soft p-4 md:p-5">
                  <SiteFormFields
                    mode="edit"
                    pending={updateMutation.isPending}
                    onCancel={() => setEditingId(null)}
                    form={editForm as UseFormReturn<CreateSiteDto | UpdateSiteDto>}
                  />
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}
    </div>
  )
}
