'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { useSiteContext } from '@/providers/site-provider'
import { ExportType, ExportStatus } from '@sakin/shared'
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
  const { selectedSiteId, availableSites, hydrated } = useSiteContext()

  // Form state
  const [type, setType] = useState<ExportType>(ExportType.COLLECTIONS)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterSiteId, setFilterSiteId] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // History state
  const [batches, setBatches] = useState<ExportBatch[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)

  useEffect(() => {
    if (!hydrated) return
    void loadHistory()
  }, [hydrated])

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
    try {
      const filters: Record<string, string> = {}
      if (filterSiteId) filters['siteId'] = filterSiteId
      if (dateFrom) filters['dateFrom'] = dateFrom
      if (dateTo) filters['dateTo'] = dateTo

      const batch = await apiClient<CreateBatchResponse>('/exports/batches', {
        method: 'POST',
        body: JSON.stringify({ type, filters }),
      })

      // Immediately download the generated CSV
      const download = await apiClient<DownloadResponse>(`/exports/batches/${batch.id}/download`)
      downloadCsv(download.csv, download.filename)

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

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Raporlar & Export"
        subtitle="Muhasebe aktarımı ve tahsilat çıktıları."
      />

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
        </div>

        {createError && <p className="text-sm text-red-600">{createError}</p>}

        <button
          onClick={() => void handleExport()}
          disabled={creating}
          className="px-4 py-2 rounded-md ledger-gradient text-white text-sm font-semibold disabled:opacity-50"
        >
          {creating ? 'Hazırlanıyor...' : 'CSV Dışa Aktar'}
        </button>
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
