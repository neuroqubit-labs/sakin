'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileDown } from 'lucide-react'
import { ExportType, ExportStatus, PaymentMethod, PaymentStatus } from '@sakin/shared'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { apiClient } from '@/lib/api'
import { toastSuccess, toastError } from '@/lib/toast'
import { useSiteContext } from '@/providers/site-provider'
import { useAuth } from '@/providers/auth-provider'
import { PageHeader } from '@/components/surface'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/formatters'

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

function triggerCsvDownload(csv: string, filename: string) {
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

  // Saved filters (localStorage)
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [saveName, setSaveName] = useState('')

  const storageKey = useMemo(
    () => `reports_saved_filters:${tenantId ?? 'anonymous'}`,
    [tenantId],
  )

  // Batch history via React Query
  const { data: batchesResponse, isLoading: historyLoading, refetch: refetchHistory } = useApiQuery<BatchListResponse>(
    ['export-batches'],
    '/exports/batches',
    undefined,
    { enabled: hydrated },
  )
  const batches = batchesResponse?.data ?? []

  // Create export mutation
  const exportMutation = useApiMutation<CreateBatchResponse, { type: ExportType; filters: Record<string, string> }>('/exports/batches', {
    invalidateKeys: [['export-batches']],
    onSuccess: async (batch) => {
      try {
        const download = await apiClient<DownloadResponse>(`/exports/batches/${batch.id}/download`)
        triggerCsvDownload(download.csv, download.filename)
        toastSuccess(`${download.rowCount} kayıt dışa aktarıldı.`)
      } catch (err) {
        toastError(err instanceof Error ? err : 'CSV indirme başarısız')
      }
    },
  })

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
        label: 'Aylık Tahsilat',
        description: 'Bu ay onaylı tahsilat odaklı rapor',
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
        label: '7 Günlük Bekleyen',
        description: 'Son 7 gün bekleyen banka transferleri',
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
        label: 'Geçen Ay Tahsilat',
        description: 'Geçen ay kapanış mutabakatı',
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
        label: 'Aylık Aidat Tahakkuk',
        description: 'Bu ay aidat/tahakkuk görünümü',
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

  // localStorage persistence for saved filters
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

  // Pre-fill site from context
  useEffect(() => {
    if (selectedSiteId && !filterSiteId) setFilterSiteId(selectedSiteId)
  }, [selectedSiteId, filterSiteId])

  function handleExport() {
    const filters: Record<string, string> = {}
    if (filterSiteId) filters['siteId'] = filterSiteId
    if (dateFrom) filters['dateFrom'] = dateFrom
    if (dateTo) filters['dateTo'] = dateTo
    if (status && type === ExportType.COLLECTIONS) filters['status'] = status
    if (method && type === ExportType.COLLECTIONS) filters['method'] = method
    exportMutation.mutate({ type, filters })
  }

  async function handleDownload(batchId: string, filename: string) {
    try {
      const download = await apiClient<DownloadResponse>(`/exports/batches/${batchId}/download`)
      triggerCsvDownload(download.csv, filename ?? download.filename)
    } catch (err) {
      toastError(err instanceof Error ? err : 'İndirme başarısız')
    }
  }

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
    toastSuccess(`Filtre kaydedildi: ${name}`)
  }

  function removeSavedFilter(id: string) {
    setSavedFilters((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raporlar"
        subtitle="Hazır şablonlar, kaydedilmiş filtreler ve dışa aktarım yönetimi."
      />

      <div className="ledger-panel p-5 space-y-4">
        <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Hazır Şablonlar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyFilter(preset.build(selectedSiteId))}
              className="text-left rounded-md bg-[#f2f4f6] px-3 py-3 hover:bg-[#e6e8ea] transition-colors"
            >
              <p className="text-sm font-semibold text-[#0c1427]">{preset.label}</p>
              <p className="text-xs text-[#6b7280] mt-1">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Export Form */}
      <div className="ledger-panel p-5 space-y-4">
        <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Yeni Dışa Aktarım</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="ledger-label">Rapor Türü</label>
            <select className="ledger-input w-full" value={type} onChange={(e) => setType(e.target.value as ExportType)}>
              {Object.values(ExportType).map((t) => (
                <option key={t} value={t}>{EXPORT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="ledger-label">Başlangıç Tarihi</label>
            <input type="date" className="ledger-input w-full" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="ledger-label">Bitiş Tarihi</label>
            <input type="date" className="ledger-input w-full" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="ledger-label">Site (opsiyonel)</label>
            <select className="ledger-input w-full" value={filterSiteId} onChange={(e) => setFilterSiteId(e.target.value)}>
              <option value="">Tüm Siteler</option>
              {availableSites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="ledger-label">Ödeme Durumu (Tahsilat)</label>
            <select className="ledger-input w-full" value={status} onChange={(e) => setStatus(e.target.value as '' | PaymentStatus)} disabled={type !== ExportType.COLLECTIONS}>
              <option value="">Tüm Durumlar</option>
              <option value={PaymentStatus.PENDING}>Bekliyor</option>
              <option value={PaymentStatus.CONFIRMED}>Onaylandı</option>
              <option value={PaymentStatus.FAILED}>Başarısız</option>
              <option value={PaymentStatus.CANCELLED}>İptal Edildi</option>
              <option value={PaymentStatus.REFUNDED}>İade Edildi</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="ledger-label">Ödeme Yöntemi (Tahsilat)</label>
            <select className="ledger-input w-full" value={method} onChange={(e) => setMethod(e.target.value as '' | PaymentMethod)} disabled={type !== ExportType.COLLECTIONS}>
              <option value="">Tüm Yöntemler</option>
              <option value={PaymentMethod.ONLINE_CARD}>Online Kart</option>
              <option value={PaymentMethod.BANK_TRANSFER}>Banka Transferi</option>
              <option value={PaymentMethod.CASH}>Nakit</option>
              <option value={PaymentMethod.POS}>POS</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="px-4 py-2 rounded-md ledger-gradient text-white text-sm font-semibold disabled:opacity-50"
          >
            {exportMutation.isPending ? 'Hazırlanıyor...' : 'CSV Dışa Aktar'}
          </button>
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Filtre adı (örnek: Haftalık Tahsilat)"
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
        <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Kaydedilmiş Filtreler</h2>
        {savedFilters.length === 0 && (
          <p className="text-sm text-[#6b7280]">Henüz kaydedilmiş filtre yok.</p>
        )}
        {savedFilters.length > 0 && (
          <div className="space-y-2">
            {savedFilters.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md bg-[#f8f9fb] px-3 py-2 gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0c1427]">{item.name}</p>
                  <p className="text-xs text-[#6b7280]">
                    {EXPORT_TYPE_LABELS[item.type]} • {item.dateFrom || '-'} / {item.dateTo || '-'} • {item.filterSiteId ? 'Site filtreli' : 'Tüm siteler'}
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
          <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Dışa Aktarım Geçmişi</h2>
          <button
            onClick={() => void refetchHistory()}
            className="text-xs text-[#6b7280] hover:text-[#0c1427]"
          >
            Yenile
          </button>
        </div>

        {historyLoading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-5 py-3"><Skeleton className="h-10 w-full" /></div>
        ))}

        {!historyLoading && batches.length === 0 && (
          <EmptyState
            icon={FileDown}
            title="Henüz dışa aktarım yok"
            description="İlk raporunuzu yukarıdaki formdan oluşturun."
          />
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
