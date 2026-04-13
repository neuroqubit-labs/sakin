'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateSiteSchema, type CreateSiteDto, type UpdateSiteDto } from '@sakin/shared'
import { Building2, Plus, Pencil, Archive, RotateCcw } from 'lucide-react'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { useSiteContext } from '@/providers/site-provider'
import { toastSuccess } from '@/lib/toast'
import { formatTry, riskLabel, riskTone } from '@/lib/formatters'
import { PageHeader, StatusPill } from '@/components/surface'
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
    return { totalSites, activeSites, archivedSites: totalSites - activeSites, totalUnits, highRiskCount }
  }, [sites, portfolioRows])

  // Create mutation
  const createMutation = useApiMutation<SiteRow, CreateSiteDto>('/sites', {
    invalidateKeys: [['sites'], ['portfolio']],
    onSuccess: () => {
      toastSuccess('Site oluşturuldu')
      setShowCreate(false)
      createForm.reset()
    },
  })

  // Update mutation
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

  // Archive toggle mutation
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

  // Create form
  const createForm = useForm<CreateSiteDto>({
    resolver: zodResolver(CreateSiteSchema),
    defaultValues: { name: '', address: '', city: '', district: '', totalUnits: 1, hasBlocks: false },
  })

  // Edit form
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
    <div className="space-y-6">
      <PageHeader
        title="Siteler"
        subtitle="Portföydeki bina kayıtları, operasyonlar ve durum kartları."
        actions={
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" />
            Yeni Site
          </Button>
        }
      />

      {/* KPI Cards */}
      {sitesLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="ledger-panel p-4">
            <p className="ledger-label">Toplam Site</p>
            <p className="ledger-value mt-2">{stats.totalSites}</p>
          </div>
          <div className="ledger-panel p-4">
            <p className="ledger-label">Aktif Site</p>
            <p className="ledger-value mt-2">{stats.activeSites}</p>
          </div>
          <div className="ledger-panel p-4">
            <p className="ledger-label">Arşiv Site</p>
            <p className="ledger-value mt-2">{stats.archivedSites}</p>
          </div>
          <div className="ledger-panel p-4">
            <p className="ledger-label">Toplam Daire</p>
            <p className="ledger-value mt-2">{stats.totalUnits}</p>
          </div>
          <div className="ledger-panel p-4">
            <p className="ledger-label">Yüksek Riskli</p>
            <p className="ledger-value mt-2">{stats.highRiskCount}</p>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="ledger-panel p-5 space-y-4">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Yeni Site Ekle</p>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site Adı</FormLabel>
                    <FormControl><Input placeholder="Güneş Apartmanı" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şehir</FormLabel>
                    <FormControl><Input placeholder="Kayseri" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İlçe (opsiyonel)</FormLabel>
                    <FormControl><Input placeholder="Melikgazi" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adres</FormLabel>
                    <FormControl><Input placeholder="Cumhuriyet Mah. 123 Sok. No:4" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="totalUnits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Toplam Daire</FormLabel>
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
              <FormField
                control={createForm.control}
                name="hasBlocks"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 pt-6">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="rounded"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Bloklu yapı</FormLabel>
                  </FormItem>
                )}
              />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Kaydediliyor...' : 'Site Ekle'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  İptal
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      {/* Site Table */}
      <div className="ledger-panel overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 ledger-table-head text-xs">
          <span className="col-span-3">Site</span>
          <span className="col-span-1 text-center">Daire</span>
          <span className="col-span-2 text-right">Aylık Tahsilat</span>
          <span className="col-span-2 text-right">Toplam Borç</span>
          <span className="col-span-2">Risk / Durum</span>
          <span className="col-span-2 text-right">Aksiyon</span>
        </div>
        <div className="ledger-divider">
          {sitesLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          {!sitesLoading && sites.length === 0 && (
            <div className="px-5 py-8 text-center">
              <Building2 className="h-8 w-8 mx-auto text-[#c5c6cd] mb-2" />
              <p className="text-sm text-[#6b7280]">Henüz kayıtlı site yok.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowCreate(true)}>
                <Plus className="h-3.5 w-3.5" /> İlk Siteyi Ekle
              </Button>
            </div>
          )}
          {!sitesLoading &&
            sites.map((site) => {
              const portfolio = portfolioById.get(site.id)
              return (
                <div key={site.id} className="grid grid-cols-12 px-5 py-3 items-center ledger-table-row-hover">
                  <div className="col-span-3">
                    <p className="text-sm font-semibold text-[#0c1427]">{site.name}</p>
                    <p className="text-xs text-[#6b7280]">
                      {site.city}
                      {site.district ? ` / ${site.district}` : ''}
                    </p>
                  </div>
                  <p className="col-span-1 text-center text-sm tabular-nums">{site._count.units}</p>
                  <p className="col-span-2 text-right text-sm tabular-nums">
                    {portfolio ? formatTry(portfolio.thisMonthCollection) : '-'}
                  </p>
                  <p className="col-span-2 text-right text-sm tabular-nums">
                    {portfolio ? formatTry(portfolio.totalDebt) : '-'}
                  </p>
                  <div className="col-span-2 flex items-center gap-2">
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
                      className="h-7 text-xs"
                      onClick={() => setSelectedSiteId(site.id)}
                    >
                      {selectedSiteId === site.id ? 'Seçili' : 'Seç'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(site)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      disabled={archiveMutation.isPending}
                      onClick={() => archiveMutation.mutate({ id: site.id, isActive: !site.isActive })}
                    >
                      {site.isActive ? <Archive className="h-3.5 w-3.5 text-[#ba1a1a]" /> : <RotateCcw className="h-3.5 w-3.5 text-green-600" />}
                    </Button>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Edit Panel */}
      {editingId && (
        <div className="ledger-panel p-5 space-y-4">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Site Düzenle</p>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ ...data, id: editingId }))}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site Adı</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şehir</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İlçe</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adres</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="totalUnits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Toplam Daire</FormLabel>
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
              <FormField
                control={editForm.control}
                name="hasBlocks"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 pt-6">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="rounded"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Bloklu yapı</FormLabel>
                  </FormItem>
                )}
              />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                  İptal
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  )
}
