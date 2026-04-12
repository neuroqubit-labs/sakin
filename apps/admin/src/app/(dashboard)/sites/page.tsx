'use client'

import { useEffect, useMemo, useState } from 'react'
import { StaffPageHeader } from '@/components/staff-surface'
import { apiClient } from '@/lib/api'
import { formatTry, riskLabel, riskTone } from '@/lib/work-presenters'
import { StaffStatusPill } from '@/components/staff-surface'
import { useSiteContext } from '@/providers/site-provider'

interface SiteRow {
  id: string
  name: string
  address: string
  city: string
  district: string | null
  totalUnits: number
  hasBlocks: boolean
  isActive: boolean
  _count: {
    units: number
  }
}

interface PortfolioRow {
  id: string
  collectionRate: number
  thisMonthCollection: number
  totalDebt: number
  overdueUnits: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

interface SiteFormState {
  name: string
  address: string
  city: string
  district: string
  totalUnits: number
  hasBlocks: boolean
}

const EMPTY_FORM: SiteFormState = {
  name: '',
  address: '',
  city: '',
  district: '',
  totalUnits: 1,
  hasBlocks: false,
}

export default function SitesPage() {
  const { selectedSiteId, setSelectedSiteId } = useSiteContext()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [sites, setSites] = useState<SiteRow[]>([])
  const [portfolioRows, setPortfolioRows] = useState<PortfolioRow[]>([])

  const [createForm, setCreateForm] = useState<SiteFormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<SiteFormState>(EMPTY_FORM)

  const portfolioById = useMemo(() => {
    const map = new Map<string, PortfolioRow>()
    portfolioRows.forEach((row) => map.set(row.id, row))
    return map
  }, [portfolioRows])

  const stats = useMemo(() => {
    const totalSites = sites.length
    const activeSites = sites.filter((site) => site.isActive).length
    const archivedSites = totalSites - activeSites
    const totalUnits = sites.reduce((sum, site) => sum + site._count.units, 0)
    const highRiskCount = portfolioRows.filter((row) => row.riskLevel === 'HIGH').length
    return {
      totalSites,
      activeSites,
      archivedSites,
      totalUnits,
      highRiskCount,
    }
  }, [sites, portfolioRows])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [siteRows, portfolio] = await Promise.all([
        apiClient<SiteRow[]>('/sites', { params: { includeInactive: true } }),
        apiClient<PortfolioRow[]>('/tenant/work-portfolio'),
      ])
      setSites(siteRows)
      setPortfolioRows(portfolio)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Site verisi yuklenemedi')
      setSites([])
      setPortfolioRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const createSite = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await apiClient<SiteRow>('/sites', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name.trim(),
          address: createForm.address.trim(),
          city: createForm.city.trim(),
          district: createForm.district.trim() || undefined,
          totalUnits: createForm.totalUnits,
          hasBlocks: createForm.hasBlocks,
        }),
      })
      setCreateForm(EMPTY_FORM)
      setMessage('Yeni site olusturuldu.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Site olusturulamadi')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (site: SiteRow) => {
    setEditingId(site.id)
    setEditForm({
      name: site.name,
      address: site.address,
      city: site.city,
      district: site.district ?? '',
      totalUnits: site.totalUnits,
      hasBlocks: site.hasBlocks,
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await apiClient<SiteRow>(`/sites/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editForm.name.trim(),
          address: editForm.address.trim(),
          city: editForm.city.trim(),
          district: editForm.district.trim() || undefined,
          totalUnits: editForm.totalUnits,
          hasBlocks: editForm.hasBlocks,
        }),
      })
      setEditingId(null)
      setMessage('Site bilgileri guncellendi.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Site guncellenemedi')
    } finally {
      setSaving(false)
    }
  }

  const toggleArchive = async (site: SiteRow) => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await apiClient<SiteRow>(`/sites/${site.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !site.isActive }),
      })
      setMessage(site.isActive ? 'Site arsive alindi.' : 'Site tekrar aktive edildi.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Site durumu guncellenemedi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Siteler"
        subtitle="Portfoydeki bina kayitlari, CRUD operasyonlari ve durum kartlari."
        actions={(
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white"
          >
            Yenile
          </button>
        )}
      />

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
          <p className="ledger-label">Arsiv Site</p>
          <p className="ledger-value mt-2">{stats.archivedSites}</p>
        </div>
        <div className="ledger-panel p-4">
          <p className="ledger-label">Toplam Daire</p>
          <p className="ledger-value mt-2">{stats.totalUnits}</p>
        </div>
        <div className="ledger-panel p-4">
          <p className="ledger-label">Yuksek Riskli Site</p>
          <p className="ledger-value mt-2">{stats.highRiskCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1 ledger-panel p-4 space-y-3">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Yeni Site Ekle</p>
          <input
            value={createForm.name}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Site adi"
            className="ledger-input bg-white"
          />
          <input
            value={createForm.city}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, city: e.target.value }))}
            placeholder="Sehir"
            className="ledger-input bg-white"
          />
          <input
            value={createForm.district}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, district: e.target.value }))}
            placeholder="Ilce (opsiyonel)"
            className="ledger-input bg-white"
          />
          <input
            value={createForm.address}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="Adres"
            className="ledger-input bg-white"
          />
          <input
            type="number"
            min={1}
            value={createForm.totalUnits}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, totalUnits: Number(e.target.value) || 1 }))}
            placeholder="Toplam daire"
            className="ledger-input bg-white"
          />
          <label className="text-xs text-[#445266] flex items-center gap-2">
            <input
              type="checkbox"
              checked={createForm.hasBlocks}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, hasBlocks: e.target.checked }))}
            />
            Bloklu yapi
          </label>
          <button
            type="button"
            disabled={saving || !createForm.name.trim() || !createForm.city.trim() || !createForm.address.trim()}
            onClick={() => void createSite()}
            className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white disabled:opacity-50"
          >
            Site Ekle
          </button>
        </div>

        <div className="xl:col-span-2 ledger-panel overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
            <span className="col-span-3">Site</span>
            <span className="col-span-1 text-center">Daire</span>
            <span className="col-span-2 text-right">Aylik Tahsilat</span>
            <span className="col-span-2 text-right">Toplam Borc</span>
            <span className="col-span-2">Risk / Durum</span>
            <span className="col-span-2 text-right">Aksiyon</span>
          </div>
          <div className="ledger-divider">
            {loading && <p className="px-5 py-5 text-sm text-[#6b7280]">Yukleniyor...</p>}
            {!loading && sites.length === 0 && <p className="px-5 py-5 text-sm text-[#6b7280]">Kayitli site bulunamadi.</p>}
            {!loading && sites.map((site) => {
              const portfolio = portfolioById.get(site.id)
              return (
                <div key={site.id} className="grid grid-cols-12 px-5 py-3 items-center ledger-table-row-hover">
                  <div className="col-span-3">
                    <p className="text-sm font-semibold text-[#0c1427]">{site.name}</p>
                    <p className="text-xs text-[#6b7280]">{site.city}{site.district ? ` / ${site.district}` : ''}</p>
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
                      <StaffStatusPill label={riskLabel(portfolio.riskLevel)} tone={riskTone(portfolio.riskLevel)} />
                    ) : (
                      <span className="ledger-chip ledger-chip-neutral">Metrik Yok</span>
                    )}
                    <span className={site.isActive ? 'ledger-chip ledger-chip-success' : 'ledger-chip ledger-chip-neutral'}>
                      {site.isActive ? 'AKTIF' : 'ARSIV'}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSiteId(site.id)}
                      className={`px-2 py-1 rounded text-xs font-semibold ${selectedSiteId === site.id ? 'bg-[#d8f7dd] text-[#006e2d]' : 'bg-[#e6e8ea] text-[#0c1427]'}`}
                    >
                      {selectedSiteId === site.id ? 'Secili' : 'Sec'}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(site)}
                      className="px-2 py-1 rounded text-xs font-semibold bg-[#e6e8ea] text-[#0c1427]"
                    >
                      Duzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleArchive(site)}
                      className={`px-2 py-1 rounded text-xs font-semibold ${site.isActive ? 'bg-[#ffe7e7] text-[#ba1a1a]' : 'bg-[#d8f7dd] text-[#006e2d]'}`}
                    >
                      {site.isActive ? 'Arsivle' : 'Aktif Et'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {editingId && (
        <div className="ledger-panel p-4 space-y-3">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Site Duzenle</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              value={editForm.name}
              onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Site adi"
              className="ledger-input bg-white"
            />
            <input
              value={editForm.city}
              onChange={(e) => setEditForm((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="Sehir"
              className="ledger-input bg-white"
            />
            <input
              value={editForm.district}
              onChange={(e) => setEditForm((prev) => ({ ...prev, district: e.target.value }))}
              placeholder="Ilce"
              className="ledger-input bg-white"
            />
            <input
              value={editForm.address}
              onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Adres"
              className="ledger-input bg-white"
            />
            <input
              type="number"
              min={1}
              value={editForm.totalUnits}
              onChange={(e) => setEditForm((prev) => ({ ...prev, totalUnits: Number(e.target.value) || 1 }))}
              placeholder="Toplam daire"
              className="ledger-input bg-white"
            />
            <label className="text-xs text-[#445266] flex items-center gap-2">
              <input
                type="checkbox"
                checked={editForm.hasBlocks}
                onChange={(e) => setEditForm((prev) => ({ ...prev, hasBlocks: e.target.checked }))}
              />
              Bloklu yapi
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving || !editForm.name.trim() || !editForm.city.trim() || !editForm.address.trim()}
              onClick={() => void saveEdit()}
              className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white disabled:opacity-50"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="px-3 py-2 rounded-md bg-[#e6e8ea] text-xs font-semibold text-[#0c1427]"
            >
              Iptal
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
