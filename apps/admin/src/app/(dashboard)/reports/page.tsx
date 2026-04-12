'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/api'
import { useSiteContext } from '@/providers/site-provider'
import { useAuth } from '@/providers/auth-provider'
import { ExportType, ExportStatus, PaymentMethod, PaymentStatus } from '@sakin/shared'
import { StaffPageHeader } from '@/components/staff-surface'
import { formatDateTime } from '@/lib/work-presenters'

const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  [ExportType.COLLECTIONS]: 'Tahsilat',
  [ExportType.DUES]: 'Aidat Tahakkukları',
  [ExportType.LEDGER]: 'Hareket Defteri',
  [ExportType.ACCOUNTING]: 'Muhasebe Aktarımı',
}

const STATUS_LABELS: Record<ExportStatus, string> = {
  [ExportStatus.PENDING]: 'Bekliyor',
  [ExportStatus.PROCESSING]: 'İşleniyor',
  [ExportStatus.COMPLETED]: 'Tamamlandı',
  [ExportStatus.FAILED]: 'Hatalı',
}

interface ExportBatch {
  id: string
  type: ExportType
  status: ExportStatus
  rowCount: number | null
  createdAt: string
  completedAt: string | null
}

interface BatchListResponse {
  data: ExportBatch[]
  meta: { total: number; page: number; limit: number }
}

interface CreateBatchResponse {
  id: string
  type: ExportType
  status: ExportStatus
  rowCount: number
}

interface DownloadResponse {
  filename: string
  csv: string
  rowCount: number
}

interface SavedFilter {
  id: string
  name: string
  type: ExportType
  filterSiteId: string
  dateFrom: string
  dateTo: string
  status: '' | PaymentStatus
  method: '' | PaymentMethod
}

interface ReportPreset {
  id: string
  label: string
  description: string
  type: ExportType
  build: (siteId: string | null) => Omit<SavedFilter, 'id' | 'name'>
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const { tenantId } = useAuth()
  const { selectedSiteId, availableSites, hydrated } = useSiteContext()

  // Form state
  const [type, setType] = useState<ExportType>(ExportType.COLLECTIONS)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterSiteId, setFilterSiteId] = useState<string>('')
  const [status, setStatus] = useState<'' | PaymentStatus>('')
  const [method, setMethod] = useState<'' | PaymentMethod>('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // History state
  const [batches, setBatches] = useState<ExportBatch[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)

  // Saved filters
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [saveName, setSaveName] = useState('')

  const storageKey = useMemo(
    () => `reports_saved_filters:${tenantId ?? 'anonymous'}`,
    [tenantId],
  )

  const presets = useMemo<ReportPreset[]>(() => {
    const now = new Date()
    const toYmd = (d: Date) => d.toISOString().slice(0, 10)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)

    return [
      {
        id: 'collections-month',
        label: 'Aylik Tahsilat',
        description: 'Bu ay onayli tahsilat odakli rapor',
        type: ExportType.COLLECTIONS,
        build: (siteId) => ({
          type: ExportType.COLLECTIONS,
          filterSiteId: siteId ?? '',
          dateFrom: toYmd(monthStart),
          dateTo: toYmd(now),
          status: PaymentStatus.CONFIRMED,
          method: '',
        }),
      },
      {
        id: 'collections-week-overdue',
        label: '7 Gunluk Bekleyen',
        description: 'Son 7 gun bekleyen banka transferleri',
        type: ExportType.COLLECTIONS,
        build: (siteId) => ({
          type: ExportType.COLLECTIONS,
          filterSiteId: siteId ?? '',
          dateFrom: toYmd(weekStart),
          dateTo: toYmd(now),
          status: PaymentStatus.PENDING,
          method: PaymentMethod.BANK_TRANSFER,
        }),
      },
      {
        id: 'collections-prev-month',
        label: 'Gecen Ay Tahsilat',
        description: 'Gecen ay kapanis mutabakati',
        type: ExportType.COLLECTIONS,
        build: (siteId) => ({
          type: ExportType.COLLECTIONS,
          filterSiteId: siteId ?? '',
          dateFrom: toYmd(prevMonthStart),
          dateTo: toYmd(prevMonthEnd),
          status: '',
          method: '',
        }),
      },
      {
        id: 'dues-month',
        label: 'Aylik Aidat Tahakkuk',
        description: 'Bu ay aidat/tahakkuk gorunumu',
        type: ExportType.DUES,
        build: (siteId) => ({
          type: ExportType.DUES,
          filterSiteId: siteId ?? '',
          dateFrom: toYmd(monthStart),
          dateTo: toYmd(now),
          status: '',
          method: '',
        }),
      },
    ]
  }, [])

  useEffect(() => {
    if (!hydrated) return
    void loadHistory()
  }, [hydrated])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as SavedFilter[]
      if (Array.isArray(parsed)) setSavedFilters(parsed)
    } catch {
      setSavedFilters([])
    }
  }, [storageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(storageKey, JSON.stringify(savedFilters))
  }, [storageKey, savedFilters])

  async function loadHistory() {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const data = await apiClient<BatchListResponse>('/exports/batches')
      setBatches(data.data)
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : 'Export geçmişi yüklenemedi')
    } finally {
      setHistoryLoading(false)
    }
  }

  async function handleExport() {
    setCreating(true)
    setCreateError(null)
    setMessage(null)
    try {
      const filters: Record<string, string> = {}
      if (filterSiteId) filters['siteId'] = filterSiteId
      if (dateFrom) filters['dateFrom'] = dateFrom
      if (dateTo) filters['dateTo'] = dateTo
      if (status && type === ExportType.COLLECTIONS) filters['status'] = status
      if (method && type === ExportType.COLLECTIONS) filters['method'] = method

      const batch = await apiClient<CreateBatchResponse>('/exports/batches', {
        method: 'POST',
        body: JSON.stringify({ type, filters }),
      })

      // Immediately download the generated CSV
      const download = await apiClient<DownloadResponse>(`/exports/batches/${batch.id}/download`)
      downloadCsv(download.csv, download.filename)
      setMessage(`${download.rowCount} kayit export edildi.`)

      // Refresh history
      void loadHistory()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Export oluşturulamadı')
    } finally {
      setCreating(false)
    }
  }

  async function handleDownload(batchId: string, filename: string) {
    try {
      const download = await apiClient<DownloadResponse>(`/exports/batches/${batchId}/download`)
      downloadCsv(download.csv, filename ?? download.filename)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'İndirme başarısız')
    }
  }

  // Pre-fill site selector with current context
  useEffect(() => {
    if (selectedSiteId && !filterSiteId) setFilterSiteId(selectedSiteId)
  }, [selectedSiteId])

  function applyFilter(filter: Omit<SavedFilter, 'id' | 'name'> | SavedFilter) {
    setType(filter.type)
    setFilterSiteId(filter.filterSiteId)
    setDateFrom(filter.dateFrom)
    setDateTo(filter.dateTo)
    setStatus(filter.status)
    setMethod(filter.method)
  }

  function saveCurrentFilter() {
    const name = saveName.trim()
    if (!name) return
    const next: SavedFilter = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      type,
      filterSiteId,
      dateFrom,
      dateTo,
      status,
      method,
    }
    setSavedFilters((prev) => [next, ...prev].slice(0, 20))
    setSaveName('')
    setMessage(`Filtre kaydedildi: ${name}`)
  }

  function removeSavedFilter(id: string) {
    setSavedFilters((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Raporlar & Export"
        subtitle="Preset paketleri, kaydedilmis filtreler ve export yonetimi."
      />

      <div className="ledger-panel p-5 space-y-4">
        <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Hazir Preset Paketleri</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyFilter(preset.build(selectedSiteId))}
              className="text-left rounded-md bg-[#f2f4f6] px-3 py-3 hover:bg-[#e6e8ea]"
            >
              <p className="text-sm font-semibold text-[#0c1427]">{preset.label}</p>
              <p className="text-xs text-[#6b7280] mt-1">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Export Form */}
      <div className="ledger-panel p-5 space-y-4">
        <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Yeni Export</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="ledger-label">Export Türü</label>
            <select
              className="ledger-input w-full"
              value={type}
              onChange={(e) => setType(e.target.value as ExportType)}
            >
              {Object.values(ExportType).map((t) => (
                <option key={t} value={t}>{EXPORT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="ledger-label">Başlangıç Tarihi</label>
            <input
              type="date"
              className="ledger-input w-full"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="ledger-label">Bitiş Tarihi</label>
            <input
              type="date"
              className="ledger-input w-full"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="ledger-label">Site (opsiyonel)</label>
            <select
              className="ledger-input w-full"
              value={filterSiteId}
              onChange={(e) => setFilterSiteId(e.target.value)}
            >
              <option value="">Tüm Siteler</option>
              {availableSites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="ledger-label">Odeme Durumu (Collections)</label>
            <select
              className="ledger-input w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as '' | PaymentStatus)}
              disabled={type !== ExportType.COLLECTIONS}
            >
              <option value="">Tum Durumlar</option>
              <option value={PaymentStatus.PENDING}>PENDING</option>
              <option value={PaymentStatus.CONFIRMED}>CONFIRMED</option>
              <option value={PaymentStatus.FAILED}>FAILED</option>
              <option value={PaymentStatus.CANCELLED}>CANCELLED</option>
              <option value={PaymentStatus.REFUNDED}>REFUNDED</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="ledger-label">Odeme Yontemi (Collections)</label>
            <select
              className="ledger-input w-full"
              value={method}
              onChange={(e) => setMethod(e.target.value as '' | PaymentMethod)}
              disabled={type !== ExportType.COLLECTIONS}
            >
              <option value="">Tum Yontemler</option>
              <option value={PaymentMethod.ONLINE_CARD}>ONLINE_CARD</option>
              <option value={PaymentMethod.BANK_TRANSFER}>BANK_TRANSFER</option>
              <option value={PaymentMethod.CASH}>CASH</option>
              <option value={PaymentMethod.POS}>POS</option>
            </select>
          </div>
        </div>

        {createError && <p className="text-sm text-red-600">{createError}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void handleExport()}
            disabled={creating}
            className="px-4 py-2 rounded-md ledger-gradient text-white text-sm font-semibold disabled:opacity-50"
          >
            {creating ? 'Hazırlanıyor...' : 'CSV Dışa Aktar'}
          </button>
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Filtre adi (ornek: Haftalik Tahsilat)"
            className="ledger-input min-w-72 bg-white"
          />
          <button
            type="button"
            onClick={saveCurrentFilter}
            disabled={!saveName.trim()}
            className="px-4 py-2 rounded-md bg-[#e6e8ea] text-[#0c1427] text-sm font-semibold disabled:opacity-50"
          >
            Filtreyi Kaydet
          </button>
        </div>
      </div>

      <div className="ledger-panel p-5 space-y-3">
        <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Kaydedilmis Filtreler</h2>
        {savedFilters.length === 0 && (
          <p className="text-sm text-[#6b7280]">Henuz kaydedilmis filtre yok.</p>
        )}
        {savedFilters.length > 0 && (
          <div className="space-y-2">
            {savedFilters.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md bg-[#f8f9fb] px-3 py-2 gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0c1427]">{item.name}</p>
                  <p className="text-xs text-[#6b7280]">
                    {EXPORT_TYPE_LABELS[item.type]} • {item.dateFrom || '-'} / {item.dateTo || '-'} • {item.filterSiteId ? 'Site filtreli' : 'Tum siteler'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyFilter(item)}
                    className="px-3 py-1.5 rounded-md bg-[#e6e8ea] text-xs font-semibold text-[#0c1427]"
                  >
                    Uygula
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSavedFilter(item.id)}
                    className="px-3 py-1.5 rounded-md bg-[#ffe7e7] text-xs font-semibold text-[#ba1a1a]"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export History */}
      <div className="ledger-panel overflow-hidden">
        <div className="px-5 py-4 bg-[#f2f4f6] flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Export Geçmişi</h2>
          <button
            onClick={() => void loadHistory()}
            className="text-xs text-[#6b7280] hover:text-[#0c1427]"
          >
            Yenile
          </button>
        </div>

        {historyError && <p className="p-4 text-sm text-red-600">{historyError}</p>}
        {historyLoading && <p className="p-4 text-sm text-[#6b7280]">Yükleniyor...</p>}

        {!historyLoading && batches.length === 0 && (
          <p className="p-5 text-sm text-[#6b7280]">Henüz export yapılmamış.</p>
        )}

        {!historyLoading && batches.length > 0 && (
          <div className="ledger-divider">
            {batches.map((batch) => (
              <div key={batch.id} className="px-5 py-3 flex items-center justify-between ledger-table-row-hover">
                <div>
                  <p className="text-sm font-semibold text-[#0c1427]">
                    {EXPORT_TYPE_LABELS[batch.type]}
                  </p>
                  <p className="text-xs text-[#6b7280] mt-0.5">
                    {formatDateTime(batch.createdAt)}
                    {batch.rowCount != null && ` · ${batch.rowCount} kayıt`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${batch.status === ExportStatus.COMPLETED ? 'text-green-600' : batch.status === ExportStatus.FAILED ? 'text-red-600' : 'text-[#6b7280]'}`}>
                    {STATUS_LABELS[batch.status]}
                  </span>
                  {batch.status === ExportStatus.COMPLETED && (
                    <button
                      onClick={() => void handleDownload(batch.id, `export-${batch.type.toLowerCase()}-${batch.id}.csv`)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      İndir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
