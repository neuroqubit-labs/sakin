'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, FileDown, Filter, History, Layers3, RefreshCcw } from 'lucide-react'
import { ExportType, ExportStatus, PaymentMethod, PaymentStatus } from '@sakin/shared'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { apiClient } from '@/lib/api'
import { toastSuccess, toastError } from '@/lib/toast'
import { useSiteContext } from '@/providers/site-provider'
import { useAuth } from '@/providers/auth-provider'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KpiCard, PageHeader, SectionTitle, StatusPill } from '@/components/surface'
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

  const [type, setType] = useState<ExportType>(ExportType.COLLECTIONS)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterSiteId, setFilterSiteId] = useState<string>('')
  const [status, setStatus] = useState<'' | PaymentStatus>('')
  const [method, setMethod] = useState<'' | PaymentMethod>('')

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [saveName, setSaveName] = useState('')

  const storageKey = useMemo(
    () => `reports_saved_filters:${tenantId ?? 'anonymous'}`,
    [tenantId],
  )

  const { data: batchesResponse, isLoading: historyLoading, refetch: refetchHistory } = useApiQuery<BatchListResponse>(
    ['export-batches'],
    '/exports/batches',
    undefined,
    { enabled: hydrated },
  )
  const batches = batchesResponse?.data ?? []

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

  const stats = useMemo(() => {
    const completed = batches.filter((batch) => batch.status === ExportStatus.COMPLETED).length
    const processing = batches.filter(
      (batch) => batch.status === ExportStatus.PENDING || batch.status === ExportStatus.PROCESSING,
    ).length
    const failed = batches.filter((batch) => batch.status === ExportStatus.FAILED).length

    return {
      completed,
      processing,
      failed,
      saved: savedFilters.length,
    }
  }, [batches, savedFilters])

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
    <div className="space-y-6 motion-in">
      <PageHeader
        title="Raporlar"
        eyebrow="Rapor Operasyonu"
        subtitle="Hazır şablonlar, filtre hafızası ve dışa aktarım geçmişiyle raporlama sürecini hızlandırın."
        actions={(
          <Button type="button" size="sm" onClick={() => void refetchHistory()}>
            <RefreshCcw className="h-4 w-4" />
            Yenile
          </Button>
        )}
      />

      <div className="motion-stagger grid grid-cols-1 gap-3 lg:grid-cols-4">
        {historyLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ledger-panel p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))
        ) : (
          <>
            <KpiCard label="Tamamlanan İş" value={stats.completed} hint="Başarıyla indirilen rapor batch'i." icon={FileDown} tone="emerald" />
            <KpiCard label="İşlemde Olan" value={stats.processing} hint="Bekleyen veya işlenen batch sayısı." icon={CalendarClock} tone="amber" />
            <KpiCard label="Kayıtlı Filtre" value={stats.saved} hint="Takım tarafından yeniden kullanılan rapor kısayolları." icon={Filter} tone="blue" />
            <KpiCard label="Hatalı Batch" value={stats.failed} hint="İzlenmesi gereken başarısız export işlemleri." icon={History} tone="rose" />
          </>
        )}
      </div>

      <div className="ledger-panel overflow-hidden">
        <SectionTitle
          title="Hazır şablonlar"
          subtitle="Sık kullanılan rapor akışlarını tek tıkla forma taşıyın."
        />
        <div className="p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyFilter(preset.build(selectedSiteId))}
                className="group rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(243,248,255,0.86))] px-4 py-4 text-left shadow-[0_16px_34px_rgba(8,17,31,0.05)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                <span className="inline-flex rounded-full border border-[#d8e5ff] bg-[#f3f8ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5374a1]">
                  {EXPORT_TYPE_LABELS[preset.type]}
                </span>
                <p className="mt-4 text-base font-semibold tracking-[-0.03em] text-[#0d182b]">{preset.label}</p>
                <p className="mt-2 text-sm leading-6 text-[#6d7d94]">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ledger-panel overflow-hidden">
        <SectionTitle
          title="Yeni dışa aktarım"
          subtitle="Tarih, site ve tahsilat filtreleriyle rapor setini belirleyin."
        />
        <div className="p-5">
          <div className="ledger-panel-soft p-4 md:p-5 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="ledger-label">Rapor Türü</label>
                <select className="ledger-input w-full bg-white" value={type} onChange={(e) => setType(e.target.value as ExportType)}>
                  {Object.values(ExportType).map((value) => (
                    <option key={value} value={value}>{EXPORT_TYPE_LABELS[value]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="ledger-label">Başlangıç Tarihi</label>
                <Input type="date" className="w-full bg-white" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="ledger-label">Bitiş Tarihi</label>
                <Input type="date" className="w-full bg-white" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="ledger-label">Site</label>
                <select className="ledger-input w-full bg-white" value={filterSiteId} onChange={(e) => setFilterSiteId(e.target.value)}>
                  <option value="">Tüm Siteler</option>
                  {availableSites.map((site) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="ledger-label">Ödeme Durumu</label>
                <select
                  className="ledger-input w-full bg-white"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as '' | PaymentStatus)}
                  disabled={type !== ExportType.COLLECTIONS}
                >
                  <option value="">Tüm Durumlar</option>
                  <option value={PaymentStatus.PENDING}>Bekliyor</option>
                  <option value={PaymentStatus.CONFIRMED}>Onaylandı</option>
                  <option value={PaymentStatus.FAILED}>Başarısız</option>
                  <option value={PaymentStatus.CANCELLED}>İptal Edildi</option>
                  <option value={PaymentStatus.REFUNDED}>İade Edildi</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="ledger-label">Ödeme Yöntemi</label>
                <select
                  className="ledger-input w-full bg-white"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as '' | PaymentMethod)}
                  disabled={type !== ExportType.COLLECTIONS}
                >
                  <option value="">Tüm Yöntemler</option>
                  <option value={PaymentMethod.ONLINE_CARD}>Online Kart</option>
                  <option value={PaymentMethod.BANK_TRANSFER}>Banka Transferi</option>
                  <option value={PaymentMethod.CASH}>Nakit</option>
                  <option value={PaymentMethod.POS}>POS</option>
                </select>
              </div>
              <div className="space-y-1 lg:col-span-2">
                <label className="ledger-label">Filtreyi Adlandır</label>
                <Input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Örnek: Haftalık Tahsilat"
                  className="bg-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleExport} disabled={exportMutation.isPending}>
                {exportMutation.isPending ? 'Hazırlanıyor...' : 'CSV Dışa Aktar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={saveCurrentFilter}
                disabled={!saveName.trim()}
              >
                Filtreyi Kaydet
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="ledger-panel overflow-hidden">
        <SectionTitle
          title="Kaydedilmiş filtreler"
          subtitle="Tekrar kullanılan rapor kalıplarını ekip hafızasında tutun."
        />
        <div className="p-5">
          {savedFilters.length === 0 ? (
            <EmptyState
              icon={Layers3}
              title="Henüz kaydedilmiş filtre yok"
              description="Sık kullandığınız rapor kombinasyonlarını burada saklayabilirsiniz."
            />
          ) : (
            <div className="space-y-2">
              {savedFilters.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-[22px] border border-white/80 bg-white/80 px-4 py-3 shadow-[0_14px_30px_rgba(8,17,31,0.04)]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0c1427]">{item.name}</p>
                    <p className="mt-1 text-xs text-[#6b7280]">
                      {EXPORT_TYPE_LABELS[item.type]} • {item.dateFrom || '-'} / {item.dateTo || '-'} • {item.filterSiteId ? 'Site filtreli' : 'Tüm siteler'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => applyFilter(item)}>
                      Uygula
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="text-[#ba1a1a]" onClick={() => removeSavedFilter(item.id)}>
                      Sil
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="ledger-panel overflow-hidden">
        <SectionTitle
          title="Dışa aktarım geçmişi"
          subtitle="Oluşturulan batch’leri izleyin ve tamamlanan setleri tekrar indirin."
          actions={(
            <Button type="button" variant="outline" size="sm" onClick={() => void refetchHistory()}>
              Yenile
            </Button>
          )}
        />

        {historyLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-5 py-3">
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          ))
        ) : batches.length === 0 ? (
          <EmptyState
            icon={FileDown}
            title="Henüz dışa aktarım yok"
            description="İlk raporunuzu yukarıdaki formdan oluşturun."
          />
        ) : (
          <div className="ledger-divider">
            {batches.map((batch) => (
              <div key={batch.id} className="px-5 py-4 flex items-center justify-between ledger-table-row-hover">
                <div>
                  <p className="text-sm font-semibold text-[#0c1427]">{EXPORT_TYPE_LABELS[batch.type]}</p>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    {formatDateTime(batch.createdAt)}
                    {batch.rowCount != null ? ` · ${batch.rowCount} kayıt` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill
                    label={STATUS_LABELS[batch.status]}
                    tone={
                      batch.status === ExportStatus.COMPLETED
                        ? 'success'
                        : batch.status === ExportStatus.FAILED
                          ? 'danger'
                          : 'warning'
                    }
                  />
                  {batch.status === ExportStatus.COMPLETED ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleDownload(batch.id, `export-${batch.type.toLowerCase()}-${batch.id}.csv`)}
                    >
                      İndir
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
