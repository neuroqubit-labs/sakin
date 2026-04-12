'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useSiteContext } from '@/providers/site-provider'
import { StaffKpiCard, StaffPageHeader, StaffStatusPill } from '@/components/staff-surface'
import { ResidentType } from '@sakin/shared'

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

export default function WorkResidentsPage() {
  const { selectedSiteId, hydrated, error: siteError } = useSiteContext()
  const searchParams = useSearchParams()

  const [items, setItems] = useState<ResidentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'passive'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | ResidentType>('all')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<ResidentListResponse['meta'] | null>(null)

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    const type = searchParams.get('type')
    const active = searchParams.get('active')
    setSearch(q)
    if (type && Object.values(ResidentType).includes(type as ResidentType)) {
      setTypeFilter(type as ResidentType)
    }
    if (active === 'true') setActiveFilter('active')
    if (active === 'false') setActiveFilter('passive')
  }, [searchParams])

  const loadResidents = async () => {
    if (!hydrated || !selectedSiteId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient<ResidentListResponse>('/residents', {
        params: {
          page,
          limit: 50,
          siteId: selectedSiteId,
          search: search.trim() || undefined,
          type: typeFilter === 'all' ? undefined : typeFilter,
          isActive:
            activeFilter === 'all' ? undefined : activeFilter === 'active' ? true : false,
        },
      })
      setItems(data.data)
      setMeta(data.meta)
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

  const stats = useMemo(() => {
    const total = items.length
    const owner = items.filter((i) => i.type === ResidentType.OWNER).length
    const tenant = items.filter((i) => i.type === ResidentType.TENANT).length
    const passive = items.filter((i) => !i.isActive).length
    return { total, owner, tenant, passive }
  }, [items])

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Work Sakinler"
        subtitle="Saha odakli sakin operasyonu ve bina bazli hizli takip."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StaffKpiCard label="Filtrelenmis Sakin" value={stats.total} />
        <StaffKpiCard label="Owner" value={stats.owner} />
        <StaffKpiCard label="Tenant" value={stats.tenant} />
        <StaffKpiCard label="Pasif" value={stats.passive} />
      </div>

      <div className="ledger-panel-soft p-3 grid grid-cols-1 lg:grid-cols-5 gap-2 items-center">
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
        <button
          type="button"
          onClick={() => {
            setPage(1)
            void loadResidents()
          }}
          className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white"
        >
          Filtrele
        </button>
      </div>

      {loading && <p className="text-sm text-[#6b7280]">Yukleniyor...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && !selectedSiteId && (
        <div className="ledger-panel p-5">
          <p className="text-sm text-[#6b7280]">
            {siteError
              ? `Site verisi alınamadı: ${siteError}`
              : 'Aktif bina secimi yok. Ust bardan bir bina secin.'}
          </p>
        </div>
      )}

      {!loading && !error && selectedSiteId && (
        <div className="ledger-panel overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
            <span className="col-span-3">Sakin</span>
            <span className="col-span-2">Iletisim</span>
            <span className="col-span-2">Tip</span>
            <span className="col-span-3">Site / Daire</span>
            <span className="col-span-2 text-right">Durum</span>
          </div>
          <div className="ledger-divider">
            {items.map((resident) => {
              const siteName = resident.occupancies[0]?.unit.site.name ?? '-'
              const unitNumber = resident.occupancies[0]?.unit.number ?? '-'
              return (
                <div key={resident.id} className="grid grid-cols-12 px-5 py-3 items-center ledger-table-row-hover">
                  <div className="col-span-3">
                    <p className="text-sm font-semibold text-[#0c1427]">{resident.firstName} {resident.lastName}</p>
                    <p className="text-xs text-[#6b7280]">{resident.email ?? '-'}</p>
                  </div>
                  <p className="col-span-2 text-sm text-[#0c1427]">{resident.phoneNumber}</p>
                  <p className="col-span-2 text-sm text-[#0c1427]">{resident.type}</p>
                  <p className="col-span-3 text-sm text-[#0c1427]">{siteName} / {unitNumber}</p>
                  <div className="col-span-2 flex justify-end">
                    <StaffStatusPill
                      label={resident.isActive ? 'AKTIF' : 'PASIF'}
                      tone={resident.isActive ? 'success' : 'neutral'}
                    />
                  </div>
                </div>
              )
            })}
            {items.length === 0 && (
              <p className="px-5 py-5 text-sm text-[#6b7280]">Kriterlere uygun sakin bulunamadi.</p>
            )}
          </div>
        </div>
      )}

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
    </div>
  )
}
