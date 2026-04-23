'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, RefreshCcw, Upload, UserCheck, UserCog, UserX, Users } from 'lucide-react'
import { ResidentType, UserRole } from '@sakin/shared'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { apiClient } from '@/lib/api'
import { toastSuccess, toastError } from '@/lib/toast'
import { useSiteContext } from '@/providers/site-provider'
import { useAuth } from '@/providers/auth-provider'
import { EmptyState } from '@/components/empty-state'
import { KpiCard, PageHeader, SectionTitle, StatusPill } from '@/components/surface'
import { ScopedBreadcrumb } from '@/components/scoped-breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ViewStatePanel } from '@/components/view-state-panel'
import { UI_COPY } from '@/lib/ui-copy'

interface ResidentItem {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phoneNumber: string
  type: ResidentType
  isActive: boolean
  occupancies: Array<{
    unit: {
      id: string
      number: string
      floor: number | null
      site: { name: string }
    }
  }>
}

interface ResidentListResponse {
  data: ResidentItem[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface DryRunRow {
  rowIndex: number
  raw: string
  valid: boolean
  normalized: {
    firstName: string
    lastName: string
    email?: string
    phoneNumber: string
    tckn?: string
    type: ResidentType
  } | null
  errors: string[]
}

interface DryRunResponse {
  summary: { totalRows: number; validRows: number; invalidRows: number }
  preview: DryRunRow[]
  exceededPreviewLimit: boolean
}

function residentTypeLabel(type: ResidentType) {
  if (type === ResidentType.OWNER) return 'Ev Sahibi'
  if (type === ResidentType.TENANT) return 'Kiracı'
  return 'İletişim Kişisi'
}

export default function ResidentsPage() {
  const { selectedSiteId, hydrated } = useSiteContext()
  const { role } = useAuth()
  const isTenantAdmin = role === UserRole.TENANT_ADMIN

  const [search, setSearch] = useState('')
  const [committedSearch, setCommittedSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'passive'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | ResidentType>('all')
  const [page, setPage] = useState(1)

  const [selected, setSelected] = useState<string[]>([])

  const [bulkIsActive, setBulkIsActive] = useState<'none' | 'active' | 'passive'>('none')
  const [bulkEmail, setBulkEmail] = useState('')
  const [bulkPhone, setBulkPhone] = useState('')
  const [bulkType, setBulkType] = useState<'none' | ResidentType>('none')

  const [csvText, setCsvText] = useState('')
  const [dryRun, setDryRun] = useState<DryRunResponse | null>(null)

  const queryParams = {
    page,
    limit: 20,
    siteId: selectedSiteId ?? undefined,
    search: committedSearch.trim() || undefined,
    type: typeFilter === 'all' ? undefined : typeFilter,
    isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
  }

  const { data: residentsResponse, isLoading, error, refetch } = useApiQuery<ResidentListResponse>(
    ['residents', queryParams],
    '/residents',
    queryParams,
    { enabled: hydrated && !!selectedSiteId },
  )

  const items = residentsResponse?.data ?? []
  const meta = residentsResponse?.meta ?? null
  const selectedSet = useMemo(() => new Set(selected), [selected])

  const stats = useMemo(() => {
    const activeCount = items.filter((resident) => resident.isActive).length
    const ownerCount = items.filter((resident) => resident.type === ResidentType.OWNER).length
    const tenantCount = items.filter((resident) => resident.type === ResidentType.TENANT).length

    return {
      total: meta?.total ?? items.length,
      activeCount,
      passiveCount: items.length - activeCount,
      ownerCount,
      tenantCount,
    }
  }, [items, meta])

  const bulkMutation = useApiMutation<{ updatedCount: number }, Record<string, unknown>>('/residents/bulk-update', {
    invalidateKeys: [['residents']],
    onSuccess: () => {
      toastSuccess('Toplu güncelleme tamamlandı')
      setBulkEmail('')
      setBulkPhone('')
      setBulkType('none')
      setBulkIsActive('none')
      setSelected([])
    },
  })

  const dryRunMutation = useApiMutation<DryRunResponse, { csv: string }>('/residents/import/dry-run', {
    onSuccess: (data) => setDryRun(data),
  })

  const importMutation = useApiMutation<unknown, { csv: string; skipInvalid: boolean }>('/residents/import/commit', {
    invalidateKeys: [['residents']],
    onSuccess: () => {
      toastSuccess('Aktarım tamamlandı')
      setCsvText('')
      setDryRun(null)
    },
  })

  const handleFilter = () => {
    setPage(1)
    setCommittedSearch(search)
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAllCurrentPage = () => {
    const allCurrentIds = items.map((item) => item.id)
    const allSelected = allCurrentIds.every((id) => selectedSet.has(id))

    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !allCurrentIds.includes(id)))
      return
    }

    setSelected((prev) => Array.from(new Set([...prev, ...allCurrentIds])))
  }

  const runBulkUpdate = () => {
    if (!isTenantAdmin || selected.length === 0) return

    bulkMutation.mutate({
      residentIds: selected,
      isActive: bulkIsActive === 'none' ? undefined : bulkIsActive === 'active',
      email: bulkEmail.trim() || undefined,
      phoneNumber: bulkPhone.trim() || undefined,
      type: bulkType === 'none' ? undefined : bulkType,
    })
  }

  const exportCsv = async () => {
    if (!isTenantAdmin) return

    try {
      const payload = await apiClient<{ fileName: string; csv: string }>('/residents/export', {
        params: {
          siteId: selectedSiteId ?? undefined,
          search: committedSearch.trim() || undefined,
          type: typeFilter === 'all' ? undefined : typeFilter,
          isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
        },
      })

      const blob = new Blob([payload.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = payload.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toastSuccess('CSV indirildi')
    } catch (err) {
      toastError(err instanceof Error ? err : 'CSV dışa aktarım başarısız')
    }
  }

  if (!hydrated) return null

  if (!selectedSiteId) {
    return (
      <div className="space-y-6 motion-in">
        <ScopedBreadcrumb module="Sakinler" />
        <PageHeader
          title={UI_COPY.residents.title}
          eyebrow={UI_COPY.residents.eyebrow}
          subtitle={UI_COPY.residents.siteRequiredSubtitle}
        />
        <ViewStatePanel
          state="empty"
          title={UI_COPY.residents.siteRequiredTitle}
          description={UI_COPY.residents.siteRequiredDescription}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 motion-in">
        <ScopedBreadcrumb module="Sakinler" />
        <PageHeader
          title={UI_COPY.residents.title}
          eyebrow={UI_COPY.residents.eyebrow}
          subtitle={UI_COPY.residents.fallbackSubtitle}
        />
        <ViewStatePanel
          state="error"
          title={UI_COPY.residents.loadErrorTitle}
          description={error instanceof Error ? error.message : 'Bir hata oluştu.'}
          actionLabel={UI_COPY.common.retry}
          actionHref="/residents"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 motion-in">
      <ScopedBreadcrumb module="Sakinler" />
      <PageHeader
        title={UI_COPY.residents.title}
        eyebrow={UI_COPY.residents.eyebrow}
        subtitle={UI_COPY.residents.pageSubtitle}
        actions={(
          <div className="flex items-center gap-2">
            {isTenantAdmin ? (
              <Button type="button" variant="outline" size="sm" onClick={() => void exportCsv()}>
                <Download className="h-4 w-4" />
                CSV Dışa Aktar
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={() => void refetch()}>
              <RefreshCcw className="h-4 w-4" />
              Yenile
            </Button>
          </div>
        )}
      />

      <div className="motion-stagger grid grid-cols-1 gap-3 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ledger-panel p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))
        ) : (
          <>
            <KpiCard label="Toplam Kayıt" value={stats.total} hint="Filtreye göre eşleşen sakin kaydı." icon={Users} tone="blue" />
            <KpiCard label="Aktif Sakin" value={stats.activeCount} hint="Mevcut sayfada aktif görünen kayıtlar." icon={UserCheck} tone="emerald" />
            <KpiCard label="Pasif Kayıt" value={stats.passiveCount} hint="Görünür listede pasif durumda olan sakin." icon={UserX} tone="amber" />
            <KpiCard label="Seçili Kayıt" value={selected.length} hint="Toplu güncelleme için işaretlenen satırlar." icon={UserCog} tone="navy" />
          </>
        )}
      </div>

      <div className="ledger-panel-soft p-3 md:p-4">
        <div className="mb-3">
          <p className="ledger-label">Filtreleme</p>
          <p className="mt-1 text-sm text-[#6b7d93]">
            Ad, telefon, durum ve sakin tipine göre listeyi daraltın. Sonuçlar seçili site bağlamında çalışır.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-5">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFilter()
            }}
            placeholder="Ad, soyad, telefon ara..."
            className="bg-white lg:col-span-2"
          />
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value as typeof activeFilter)
              setPage(1)
            }}
            className="ledger-input bg-white"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as typeof typeFilter)
              setPage(1)
            }}
            className="ledger-input bg-white"
          >
            <option value="all">Tüm Tipler</option>
            <option value={ResidentType.OWNER}>Ev Sahibi</option>
            <option value={ResidentType.TENANT}>Kiracı</option>
            <option value={ResidentType.CONTACT}>İletişim Kişisi</option>
          </select>
          <Button type="button" onClick={handleFilter}>
            Filtrele
          </Button>
        </div>
      </div>

      <div className="ledger-panel overflow-hidden">
        <SectionTitle
          title="Sakin listesi"
          subtitle="İletişim bilgileri, daire ataması ve durum görünümü."
        />
        <div className="hidden xl:block overflow-x-auto">
          <div className="min-w-[880px]">
            <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
              <span className="col-span-1">
                <input
                  type="checkbox"
                  checked={items.length > 0 && items.every((i) => selectedSet.has(i.id))}
                  onChange={toggleSelectAllCurrentPage}
                />
              </span>
              <span className="col-span-3">Sakin</span>
              <span className="col-span-2">İletişim</span>
              <span className="col-span-2">Tip</span>
              <span className="col-span-2">Site / Daire</span>
              <span className="col-span-1 text-right">Durum</span>
              <span className="col-span-1 text-right">Detay</span>
            </div>

            <div className="ledger-divider">
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-12 px-5 py-3 gap-3 items-center">
                  <Skeleton className="col-span-1 h-4 w-4 rounded" />
                  <Skeleton className="col-span-3 h-12 rounded-2xl" />
                  <Skeleton className="col-span-2 h-12 rounded-2xl" />
                  <Skeleton className="col-span-2 h-12 rounded-2xl" />
                  <Skeleton className="col-span-2 h-12 rounded-2xl" />
                  <Skeleton className="col-span-2 h-12 rounded-2xl" />
                </div>
              ))}

              {!isLoading && items.length === 0 && (
                <EmptyState
                  icon={Users}
                  title="Sakin bulunamadı"
                  description="Bu filtreyle eşleşen kayıt yok. Arama veya durum filtresini genişletin."
                />
              )}

              {!isLoading && items.map((resident) => {
                const siteName = resident.occupancies[0]?.unit.site.name ?? '-'
                const unitNumber = resident.occupancies[0]?.unit.number ?? '-'

                return (
                  <div key={resident.id} className="grid grid-cols-12 px-5 py-4 items-center ledger-table-row-hover">
                    <span className="col-span-1">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(resident.id)}
                        onChange={() => toggleSelect(resident.id)}
                      />
                    </span>
                    <div className="col-span-3 min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0c1427]">
                        {resident.firstName} {resident.lastName}
                      </p>
                      <p className="truncate text-xs text-[#6b7280]">{resident.email ?? '-'}</p>
                    </div>
                    <p className="col-span-2 text-sm text-[#0c1427]">{resident.phoneNumber}</p>
                    <div className="col-span-2">
                      <span className="ledger-chip ledger-chip-neutral">
                        {residentTypeLabel(resident.type)}
                      </span>
                    </div>
                    <p className="col-span-2 truncate text-sm text-[#0c1427]">
                      {siteName} / {unitNumber}
                    </p>
                    <div className="col-span-1 flex justify-end">
                      <StatusPill
                        label={resident.isActive ? 'Aktif' : 'Pasif'}
                        tone={resident.isActive ? 'success' : 'neutral'}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Link href={`/residents/${resident.id}`}>
                        <Button size="sm" className="h-8 px-3 text-xs">
                          Detay
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4 xl:hidden">
          <div className="flex items-center justify-between rounded-[16px] border border-white/80 bg-white/74 px-3 py-2 text-xs text-[#506176]">
            <p>Bu sayfadaki sakinleri toplu işlem için seçin.</p>
            <label className="inline-flex items-center gap-2 font-semibold text-[#0c1427]">
              <input
                type="checkbox"
                checked={items.length > 0 && items.every((i) => selectedSet.has(i.id))}
                onChange={toggleSelectAllCurrentPage}
              />
              Tümünü Seç
            </label>
          </div>

          {isLoading && Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-[20px] border border-white/80 bg-white/80 p-4 shadow-[0_12px_26px_rgba(8,17,31,0.05)]">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-4 w-64" />
              <Skeleton className="mt-3 h-16 w-full rounded-xl" />
            </div>
          ))}

          {!isLoading && items.length === 0 && (
            <EmptyState
              icon={Users}
              title="Sakin bulunamadı"
              description="Bu filtreyle eşleşen kayıt yok. Arama veya durum filtresini genişletin."
            />
          )}

          {!isLoading && items.map((resident) => {
            const siteName = resident.occupancies[0]?.unit.site.name ?? '-'
            const unitNumber = resident.occupancies[0]?.unit.number ?? '-'

            return (
              <div key={resident.id} className="rounded-[20px] border border-white/80 bg-white/80 p-4 shadow-[0_12px_26px_rgba(8,17,31,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0c1427]">
                      {resident.firstName} {resident.lastName}
                    </p>
                    <p className="mt-1 truncate text-xs text-[#6b7280]">{resident.email ?? '-'}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedSet.has(resident.id)}
                    onChange={() => toggleSelect(resident.id)}
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
                    <p className="text-[#6b7280]">Telefon</p>
                    <p className="mt-0.5 text-[#0c1427]">{resident.phoneNumber}</p>
                  </div>
                  <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
                    <p className="text-[#6b7280]">Tip</p>
                    <p className="mt-0.5 text-[#0c1427]">{residentTypeLabel(resident.type)}</p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-[#f8fafc] px-3 py-2">
                    <p className="text-[#6b7280]">Site / Daire</p>
                    <p className="mt-0.5 text-[#0c1427]">{siteName} / {unitNumber}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <StatusPill
                    label={resident.isActive ? 'Aktif' : 'Pasif'}
                    tone={resident.isActive ? 'success' : 'neutral'}
                  />
                  <Link href={`/residents/${resident.id}`}>
                    <Button size="sm" className="h-8 px-3 text-xs">
                      Detay
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {meta ? (
        <div className="flex items-center justify-between rounded-[22px] border border-white/80 bg-white/74 px-4 py-3 text-xs text-[#6b7280] shadow-[0_14px_30px_rgba(8,17,31,0.04)]">
          <span>
            Toplam {meta.total} kayıt • Sayfa {meta.page}/{Math.max(meta.totalPages, 1)}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Önceki
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sonraki
            </Button>
          </div>
        </div>
      ) : null}

      {isTenantAdmin ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="ledger-panel overflow-hidden">
            <SectionTitle
              title="Toplu güncelleme"
              subtitle={`Seçili kayıt: ${selected.length}. Durum, tip ve iletişim alanlarını tek seferde güncelleyin.`}
            />
            <div className="p-5">
              <div className="ledger-panel-soft p-4 md:p-5 space-y-4">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <select
                    value={bulkIsActive}
                    onChange={(e) => setBulkIsActive(e.target.value as typeof bulkIsActive)}
                    className="ledger-input bg-white"
                  >
                    <option value="none">Durum Değiştirme</option>
                    <option value="active">Aktif Yap</option>
                    <option value="passive">Pasif Yap</option>
                  </select>
                  <select
                    value={bulkType}
                    onChange={(e) => setBulkType(e.target.value as typeof bulkType)}
                    className="ledger-input bg-white"
                  >
                    <option value="none">Tip Değiştirme</option>
                    <option value={ResidentType.OWNER}>Ev Sahibi</option>
                    <option value={ResidentType.TENANT}>Kiracı</option>
                    <option value={ResidentType.CONTACT}>İletişim Kişisi</option>
                  </select>
                  <Input
                    value={bulkEmail}
                    onChange={(e) => setBulkEmail(e.target.value)}
                    placeholder="Toplu e-posta (opsiyonel)"
                    className="bg-white"
                  />
                  <Input
                    value={bulkPhone}
                    onChange={(e) => setBulkPhone(e.target.value)}
                    placeholder="Toplu telefon (opsiyonel)"
                    className="bg-white"
                  />
                </div>
                <Button
                  type="button"
                  disabled={bulkMutation.isPending || selected.length === 0}
                  onClick={runBulkUpdate}
                >
                  {bulkMutation.isPending ? 'İşleniyor...' : 'Toplu Güncelle'}
                </Button>
              </div>
            </div>
          </div>

          <div className="ledger-panel overflow-hidden">
            <SectionTitle
              title="CSV aktarım"
              subtitle="Hızlı toplu kayıt için önce önizleme al, sonra geçerli satırları içe aktar."
            />
            <div className="p-5">
              <div className="ledger-panel-soft p-4 md:p-5 space-y-4">
                <Textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  rows={8}
                  className="bg-white"
                  placeholder="firstName,lastName,email,phoneNumber,tckn,type&#10;Ali,Yilmaz,ali@test.com,05320000000,12345678901,OWNER"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={dryRunMutation.isPending || importMutation.isPending || !csvText.trim()}
                    onClick={() => dryRunMutation.mutate({ csv: csvText })}
                  >
                    <UserCog className="h-4 w-4" />
                    {dryRunMutation.isPending ? 'Kontrol ediliyor...' : 'Önizleme'}
                  </Button>
                  <Button
                    type="button"
                    disabled={dryRunMutation.isPending || importMutation.isPending || !csvText.trim()}
                    onClick={() => importMutation.mutate({ csv: csvText, skipInvalid: true })}
                  >
                    <Upload className="h-4 w-4" />
                    {importMutation.isPending ? 'Aktarılıyor...' : 'Uygula'}
                  </Button>
                </div>
                {dryRun ? (
                  <div className="rounded-[20px] border border-white/80 bg-white/80 p-4 text-xs text-[#445266] shadow-[0_14px_30px_rgba(8,17,31,0.04)]">
                    <p className="font-semibold text-[#0d182b]">
                      Toplam: {dryRun.summary.totalRows} • Geçerli: {dryRun.summary.validRows} • Hatalı: {dryRun.summary.invalidRows}
                    </p>
                    <div className="mt-3 max-h-40 overflow-auto space-y-1">
                      {dryRun.preview.map((row) => (
                        <p key={row.rowIndex} className={row.valid ? 'text-[#0e7a52]' : 'text-[#ba1a1a]'}>
                          Satır {row.rowIndex}: {row.valid ? 'Geçerli' : row.errors.join(' | ')}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="ledger-panel p-5">
          <p className="text-sm text-[#6b7280]">
            Personel rolü bu ekranda listeleme yapabilir. CSV aktarım ve toplu güncelleme yalnızca yönetici yetkisiyle kullanılır.
          </p>
        </div>
      )}
    </div>
  )
}
