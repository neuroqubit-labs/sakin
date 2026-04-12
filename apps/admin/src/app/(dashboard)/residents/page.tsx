'use client'

import { useEffect, useMemo, useState } from 'react'
import { StaffPageHeader } from '@/components/staff-surface'
import { apiClient } from '@/lib/api'
import { useSiteContext } from '@/providers/site-provider'
import { useAuth } from '@/providers/auth-provider'
import { ResidentType, UserRole } from '@sakin/shared'

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
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
  }
  preview: DryRunRow[]
  exceededPreviewLimit: boolean
}

export default function ResidentsPage() {
  const { selectedSiteId, hydrated } = useSiteContext()
  const { role } = useAuth()
  const isTenantAdmin = role === UserRole.TENANT_ADMIN

  const [items, setItems] = useState<ResidentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'passive'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | ResidentType>('all')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<ResidentListResponse['meta'] | null>(null)

  const [selected, setSelected] = useState<string[]>([])
  const [bulkIsActive, setBulkIsActive] = useState<'none' | 'active' | 'passive'>('none')
  const [bulkEmail, setBulkEmail] = useState('')
  const [bulkPhone, setBulkPhone] = useState('')
  const [bulkType, setBulkType] = useState<'none' | ResidentType>('none')
  const [bulkRunning, setBulkRunning] = useState(false)

  const [csvText, setCsvText] = useState('')
  const [dryRun, setDryRun] = useState<DryRunResponse | null>(null)
  const [importRunning, setImportRunning] = useState(false)

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const loadResidents = async () => {
    if (!hydrated) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient<ResidentListResponse>('/residents', {
        params: {
          page,
          limit: 20,
          siteId: selectedSiteId ?? undefined,
          search: search.trim() || undefined,
          type: typeFilter === 'all' ? undefined : typeFilter,
          isActive:
            activeFilter === 'all' ? undefined : activeFilter === 'active' ? true : false,
        },
      })
      setItems(data.data)
      setMeta(data.meta)
      setSelected((prev) => prev.filter((id) => data.data.some((item) => item.id === id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sakin listesi alinamadi')
      setItems([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadResidents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, selectedSiteId, page, activeFilter, typeFilter])

  const runSearch = async () => {
    setPage(1)
    await loadResidents()
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

  const runBulkUpdate = async () => {
    if (!isTenantAdmin || selected.length === 0) return
    setBulkRunning(true)
    setError(null)
    try {
      await apiClient<{ updatedCount: number }>('/residents/bulk-update', {
        method: 'POST',
        body: JSON.stringify({
          residentIds: selected,
          isActive:
            bulkIsActive === 'none' ? undefined : bulkIsActive === 'active',
          email: bulkEmail.trim() || undefined,
          phoneNumber: bulkPhone.trim() || undefined,
          type: bulkType === 'none' ? undefined : bulkType,
        }),
      })
      setBulkEmail('')
      setBulkPhone('')
      setBulkType('none')
      setBulkIsActive('none')
      await loadResidents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk update basarisiz')
    } finally {
      setBulkRunning(false)
    }
  }

  const runDryRun = async () => {
    if (!isTenantAdmin || !csvText.trim()) return
    setImportRunning(true)
    setError(null)
    try {
      const result = await apiClient<DryRunResponse>('/residents/import/dry-run', {
        method: 'POST',
        body: JSON.stringify({ csv: csvText }),
      })
      setDryRun(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dry-run basarisiz')
    } finally {
      setImportRunning(false)
    }
  }

  const runImportCommit = async () => {
    if (!isTenantAdmin || !csvText.trim()) return
    setImportRunning(true)
    setError(null)
    try {
      await apiClient('/residents/import/commit', {
        method: 'POST',
        body: JSON.stringify({ csv: csvText, skipInvalid: true }),
      })
      setCsvText('')
      setDryRun(null)
      await loadResidents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import commit basarisiz')
    } finally {
      setImportRunning(false)
    }
  }

  const exportCsv = async () => {
    if (!isTenantAdmin) return
    setError(null)
    try {
      const payload = await apiClient<{ fileName: string; csv: string }>('/residents/export', {
        params: {
          siteId: selectedSiteId ?? undefined,
          search: search.trim() || undefined,
          type: typeFilter === 'all' ? undefined : typeFilter,
          isActive:
            activeFilter === 'all' ? undefined : activeFilter === 'active' ? true : false,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV export basarisiz')
    }
  }

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Sakinler"
        subtitle="Tenant çapında sakin kayıtları ve ilişkilendirildiği daire bilgileri."
        actions={
          <div className="flex items-center gap-2">
            {isTenantAdmin && (
              <button
                type="button"
                onClick={exportCsv}
                className="px-3 py-2 rounded-md bg-[#e6e8ea] text-xs font-semibold text-[#0c1427]"
              >
                CSV Export
              </button>
            )}
            <button
              type="button"
              onClick={() => void loadResidents()}
              className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white"
            >
              Yenile
            </button>
          </div>
        }
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="ledger-panel p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, soyad, telefon ara..."
            className="ledger-input bg-white lg:col-span-2"
          />
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}
            className="ledger-input bg-white"
          >
            <option value="all">Tum Durumlar</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="ledger-input bg-white"
          >
            <option value="all">Tum Tipler</option>
            <option value={ResidentType.OWNER}>OWNER</option>
            <option value={ResidentType.TENANT}>TENANT</option>
            <option value={ResidentType.CONTACT}>CONTACT</option>
          </select>
          <button type="button" onClick={() => void runSearch()} className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white">
            Filtrele
          </button>
        </div>
      </div>

      <div className="ledger-panel overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
          <span className="col-span-1">
            <input type="checkbox" checked={items.length > 0 && items.every((i) => selectedSet.has(i.id))} onChange={toggleSelectAllCurrentPage} />
          </span>
          <span className="col-span-3">Sakin</span>
          <span className="col-span-2">Iletisim</span>
          <span className="col-span-2">Tip</span>
          <span className="col-span-2">Site/Daire</span>
          <span className="col-span-2 text-right">Durum</span>
        </div>

        <div className="ledger-divider">
          {loading && <p className="px-5 py-4 text-sm text-[#6b7280]">Yukleniyor...</p>}
          {!loading && items.length === 0 && <p className="px-5 py-4 text-sm text-[#6b7280]">Kriterlere uygun sakin bulunamadi.</p>}
          {!loading &&
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
                  <p className="col-span-2 text-sm text-[#0c1427]">{resident.type}</p>
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

      {meta && (
        <div className="flex items-center justify-between text-xs text-[#6b7280]">
          <span>
            Toplam {meta.total} kayit • Sayfa {meta.page}/{Math.max(meta.totalPages, 1)}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 rounded bg-[#e6e8ea] disabled:opacity-50"
            >
              Onceki
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
            <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Bulk Update</p>
            <p className="text-xs text-[#6b7280]">Secili kayit: {selected.length}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <select
                value={bulkIsActive}
                onChange={(e) => setBulkIsActive(e.target.value as typeof bulkIsActive)}
                className="ledger-input bg-white"
              >
                <option value="none">Durum Degistirme</option>
                <option value="active">Aktif Yap</option>
                <option value="passive">Pasif Yap</option>
              </select>
              <select
                value={bulkType}
                onChange={(e) => setBulkType(e.target.value as typeof bulkType)}
                className="ledger-input bg-white"
              >
                <option value="none">Tip Degistirme</option>
                <option value={ResidentType.OWNER}>OWNER</option>
                <option value={ResidentType.TENANT}>TENANT</option>
                <option value={ResidentType.CONTACT}>CONTACT</option>
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
              disabled={bulkRunning || selected.length === 0}
              onClick={() => void runBulkUpdate()}
              className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white disabled:opacity-50"
            >
              {bulkRunning ? 'Calisiyor...' : 'Bulk Update Uygula'}
            </button>
          </div>

          <div className="ledger-panel p-4 space-y-3">
            <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">CSV Import</p>
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
                disabled={importRunning || !csvText.trim()}
                onClick={() => void runDryRun()}
                className="px-3 py-2 rounded-md bg-[#e6e8ea] text-xs font-semibold text-[#0c1427] disabled:opacity-50"
              >
                Dry-Run
              </button>
              <button
                type="button"
                disabled={importRunning || !csvText.trim()}
                onClick={() => void runImportCommit()}
                className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white disabled:opacity-50"
              >
                Commit
              </button>
            </div>
            {dryRun && (
              <div className="rounded-md bg-[#f8f9fb] p-3 text-xs text-[#445266] space-y-2">
                <p>
                  Toplam: {dryRun.summary.totalRows} • Gecerli: {dryRun.summary.validRows} • Hatali: {dryRun.summary.invalidRows}
                </p>
                <div className="max-h-40 overflow-auto space-y-1">
                  {dryRun.preview.map((row) => (
                    <p key={row.rowIndex} className={row.valid ? 'text-[#006e2d]' : 'text-[#ba1a1a]'}>
                      Satir {row.rowIndex}: {row.valid ? 'OK' : row.errors.join(' | ')}
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
          <p className="text-sm text-[#6b7280]">STAFF rolu bu ekranda listeleme yapabilir. Import/export ve bulk update sadece TENANT_ADMIN icindir.</p>
        </div>
      )}
    </div>
  )
}
