'use client'

import { useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { ResidentType, UserRole } from '@sakin/shared'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { apiClient } from '@/lib/api'
import { toastSuccess, toastError } from '@/lib/toast'
import { useSiteContext } from '@/providers/site-provider'
import { useAuth } from '@/providers/auth-provider'
import { PageHeader } from '@/components/surface'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'

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

export default function ResidentsPage() {
  const { selectedSiteId, hydrated } = useSiteContext()
  const { role } = useAuth()
  const isTenantAdmin = role === UserRole.TENANT_ADMIN

  // Filter state
  const [search, setSearch] = useState('')
  const [committedSearch, setCommittedSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'passive'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | ResidentType>('all')
  const [page, setPage] = useState(1)

  // Selection state
  const [selected, setSelected] = useState<string[]>([])

  // Bulk update form
  const [bulkIsActive, setBulkIsActive] = useState<'none' | 'active' | 'passive'>('none')
  const [bulkEmail, setBulkEmail] = useState('')
  const [bulkPhone, setBulkPhone] = useState('')
  const [bulkType, setBulkType] = useState<'none' | ResidentType>('none')

  // CSV import
  const [csvText, setCsvText] = useState('')
  const [dryRun, setDryRun] = useState<DryRunResponse | null>(null)

  const queryParams = {
    page,
    limit: 20,
    siteId: selectedSiteId ?? undefined,
    search: committedSearch.trim() || undefined,
    type: typeFilter === 'all' ? undefined : typeFilter,
    isActive: activeFilter === 'all' ? undefined : activeFilter === 'active' ? true : false,
  }

  const { data: residentsResponse, isLoading, refetch } = useApiQuery<ResidentListResponse>(
    ['residents', queryParams],
    '/residents',
    queryParams,
    { enabled: hydrated && !!selectedSiteId },
  )
  const items = residentsResponse?.data ?? []
  const meta = residentsResponse?.meta ?? null

  const selectedSet = useMemo(() => new Set(selected), [selected])

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
          isActive: activeFilter === 'all' ? undefined : activeFilter === 'active' ? true : false,
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sakinler"
        subtitle="Sakin kayıtları ve bağlı oldukları daire bilgileri."
        actions={
          <div className="flex items-center gap-2">
            {isTenantAdmin && (
              <button
                type="button"
                onClick={() => void exportCsv()}
                className="px-3 py-2 rounded-md bg-[#e6e8ea] text-xs font-semibold text-[#0c1427]"
              >
                CSV Dışa Aktar
              </button>
            )}
            <button
              type="button"
              onClick={() => void refetch()}
              className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white"
            >
              Yenile
            </button>
          </div>
        }
      />

      <div className="ledger-panel p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFilter() }}
            placeholder="Ad, soyad, telefon ara..."
            className="ledger-input bg-white lg:col-span-2"
          />
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value as typeof activeFilter); setPage(1) }}
            className="ledger-input bg-white"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as typeof typeFilter); setPage(1) }}
            className="ledger-input bg-white"
          >
            <option value="all">Tüm Tipler</option>
            <option value={ResidentType.OWNER}>Ev Sahibi</option>
            <option value={ResidentType.TENANT}>Kiracı</option>
            <option value={ResidentType.CONTACT}>İletişim Kişisi</option>
          </select>
          <button type="button" onClick={handleFilter} className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white">
            Filtrele
          </button>
        </div>
      </div>

      <div className="ledger-panel overflow-x-auto">
        <div className="min-w-[800px]">
        <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
          <span className="col-span-1">
            <input type="checkbox" checked={items.length > 0 && items.every((i) => selectedSet.has(i.id))} onChange={toggleSelectAllCurrentPage} />
          </span>
          <span className="col-span-3">Sakin</span>
          <span className="col-span-2">İletişim</span>
          <span className="col-span-2">Tip</span>
          <span className="col-span-2">Site/Daire</span>
          <span className="col-span-2 text-right">Durum</span>
        </div>

        <div className="ledger-divider">
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 px-5 py-3 gap-3">
              <Skeleton className="col-span-1 h-4 w-4" />
              <Skeleton className="col-span-3 h-5" />
              <Skeleton className="col-span-2 h-5" />
              <Skeleton className="col-span-2 h-5" />
              <Skeleton className="col-span-2 h-5" />
              <Skeleton className="col-span-2 h-5" />
            </div>
          ))}
          {!isLoading && items.length === 0 && (
            <EmptyState
              icon={Users}
              title="Sakin bulunamadı"
              description="Kriterlere uygun sakin kaydı yok."
            />
          )}
          {!isLoading &&
            items.map((resident) => {
              const siteName = resident.occupancies[0]?.unit.site.name ?? '-'
              const unitNumber = resident.occupancies[0]?.unit.number ?? '-'
              return (
                <div key={resident.id} className="grid grid-cols-12 px-5 py-3 items-center ledger-table-row-hover">
                  <span className="col-span-1">
                    <input type="checkbox" checked={selectedSet.has(resident.id)} onChange={() => toggleSelect(resident.id)} />
                  </span>
                  <div className="col-span-3">
                    <p className="text-sm font-semibold text-[#0c1427]">{resident.firstName} {resident.lastName}</p>
                    <p className="text-xs text-[#6b7280]">{resident.email ?? '-'}</p>
                  </div>
                  <p className="col-span-2 text-sm text-[#0c1427]">{resident.phoneNumber}</p>
                  <p className="col-span-2 text-sm text-[#0c1427]">{resident.type === 'OWNER' ? 'Ev Sahibi' : resident.type === 'TENANT' ? 'Kiracı' : 'İletişim Kişisi'}</p>
                  <p className="col-span-2 text-sm text-[#0c1427]">{siteName} / {unitNumber}</p>
                  <p className="col-span-2 text-right text-xs font-semibold">
                    <span className={resident.isActive ? 'text-[#006e2d]' : 'text-[#ba1a1a]'}>
                      {resident.isActive ? 'AKTIF' : 'PASIF'}
                    </span>
                  </p>
                </div>
              )
            })}
        </div>
        </div>
      </div>

      {meta && (
        <div className="flex items-center justify-between text-xs text-[#6b7280]">
          <span>
            Toplam {meta.total} kayıt • Sayfa {meta.page}/{Math.max(meta.totalPages, 1)}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 rounded bg-[#e6e8ea] disabled:opacity-50"
            >
              Önceki
            </button>
            <button
              type="button"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 rounded bg-[#e6e8ea] disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}

      {isTenantAdmin && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="ledger-panel p-4 space-y-3">
            <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Toplu Güncelleme</p>
            <p className="text-xs text-[#6b7280]">Seçili kayıt: {selected.length}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
              <input
                value={bulkEmail}
                onChange={(e) => setBulkEmail(e.target.value)}
                placeholder="Toplu email (opsiyonel)"
                className="ledger-input bg-white"
              />
              <input
                value={bulkPhone}
                onChange={(e) => setBulkPhone(e.target.value)}
                placeholder="Toplu telefon (opsiyonel)"
                className="ledger-input bg-white"
              />
            </div>
            <button
              type="button"
              disabled={bulkMutation.isPending || selected.length === 0}
              onClick={runBulkUpdate}
              className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white disabled:opacity-50"
            >
              {bulkMutation.isPending ? 'İşleniyor...' : 'Toplu Güncelle'}
            </button>
          </div>

          <div className="ledger-panel p-4 space-y-3">
            <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">CSV Aktarım</p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
              className="w-full ledger-input bg-white"
              placeholder="firstName,lastName,email,phoneNumber,tckn,type&#10;Ali,Yilmaz,ali@test.com,05320000000,12345678901,OWNER"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={dryRunMutation.isPending || importMutation.isPending || !csvText.trim()}
                onClick={() => dryRunMutation.mutate({ csv: csvText })}
                className="px-3 py-2 rounded-md bg-[#e6e8ea] text-xs font-semibold text-[#0c1427] disabled:opacity-50"
              >
                {dryRunMutation.isPending ? 'Kontrol ediliyor...' : 'Önizleme'}
              </button>
              <button
                type="button"
                disabled={dryRunMutation.isPending || importMutation.isPending || !csvText.trim()}
                onClick={() => importMutation.mutate({ csv: csvText, skipInvalid: true })}
                className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white disabled:opacity-50"
              >
                {importMutation.isPending ? 'Aktarılıyor...' : 'Uygula'}
              </button>
            </div>
            {dryRun && (
              <div className="rounded-md bg-[#f8f9fb] p-3 text-xs text-[#445266] space-y-2">
                <p>
                  Toplam: {dryRun.summary.totalRows} • Geçerli: {dryRun.summary.validRows} • Hatalı: {dryRun.summary.invalidRows}
                </p>
                <div className="max-h-40 overflow-auto space-y-1">
                  {dryRun.preview.map((row) => (
                    <p key={row.rowIndex} className={row.valid ? 'text-[#006e2d]' : 'text-[#ba1a1a]'}>
                      Satır {row.rowIndex}: {row.valid ? 'Geçerli' : row.errors.join(' | ')}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!isTenantAdmin && (
        <div className="ledger-panel p-4">
          <p className="text-sm text-[#6b7280]">Personel rolü bu ekranda listeleme yapabilir. CSV aktarım ve toplu güncelleme yalnızca yönetici yetkisiyle kullanılır.</p>
        </div>
      )}
    </div>
  )
}
