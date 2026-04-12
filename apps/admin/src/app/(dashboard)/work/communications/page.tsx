'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { useSiteContext } from '@/providers/site-provider'
import { StaffPageHeader, StaffStatusPill } from '@/components/staff-surface'
import { formatDateTime } from '@/lib/work-presenters'
import { NotificationChannel, NotificationStatus } from '@sakin/shared'

type BroadcastTarget = 'TENANT_ALL' | 'SITE' | 'UNIT' | 'RESIDENT'

interface BroadcastDryRunResponse {
  dryRun: boolean
  recipientCount: number
  preview: Array<{
    residentId: string
    unitId: string
    userId: string | null
    residentName: string
  }>
}

interface BroadcastSendResponse {
  dryRun: boolean
  recipientCount: number
  createdCount: number
}

interface NotificationHistoryRow {
  id: string
  templateKey: string | null
  payload: unknown
  status: NotificationStatus
  channel: NotificationChannel
  createdAt: string
  sentAt: string | null
  resident: {
    firstName: string
    lastName: string
    phoneNumber: string
  } | null
  unit: {
    number: string
    site: { name: string }
  } | null
  sentByUser: {
    displayName: string | null
    email: string
  } | null
}

interface NotificationHistoryResponse {
  data: NotificationHistoryRow[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

function statusTone(status: NotificationStatus): 'danger' | 'success' | 'warning' | 'neutral' {
  if (status === NotificationStatus.FAILED) return 'danger'
  if (status === NotificationStatus.SENT) return 'success'
  if (status === NotificationStatus.PENDING) return 'warning'
  return 'neutral'
}

export default function WorkCommunicationsPage() {
  const { selectedSiteId, hydrated } = useSiteContext()
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [title, setTitle] = useState('Aidat Hatirlatmasi')
  const [body, setBody] = useState('Lutfen acik bakiyenizi en kisa surede odemenizi rica ederiz.')
  const [templateKey, setTemplateKey] = useState('manual.reminder')
  const [target, setTarget] = useState<BroadcastTarget>('SITE')
  const [channel, setChannel] = useState<NotificationChannel>(NotificationChannel.PUSH)
  const [scopeSiteId, setScopeSiteId] = useState('')
  const [scopeUnitId, setScopeUnitId] = useState('')
  const [scopeResidentId, setScopeResidentId] = useState('')

  const [history, setHistory] = useState<NotificationHistoryRow[]>([])
  const [historyMeta, setHistoryMeta] = useState<NotificationHistoryResponse['meta'] | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | NotificationStatus>('ALL')
  const [channelFilter, setChannelFilter] = useState<'ALL' | NotificationChannel>('ALL')
  const [preview, setPreview] = useState<BroadcastDryRunResponse | null>(null)

  useEffect(() => {
    if (selectedSiteId && !scopeSiteId) setScopeSiteId(selectedSiteId)
  }, [selectedSiteId, scopeSiteId])

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient<NotificationHistoryResponse>('/notifications/history', {
        params: {
          siteId: scopeSiteId || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          channel: channelFilter === 'ALL' ? undefined : channelFilter,
          search: search.trim() || undefined,
          page: 1,
          limit: 50,
        },
      })
      setHistory(res.data)
      setHistoryMeta(res.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Iletisim gecmisi yuklenemedi')
      setHistory([])
      setHistoryMeta(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hydrated) return
    void loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, scopeSiteId, statusFilter, channelFilter])

  const runDryRun = async () => {
    setSending(true)
    setError(null)
    setMessage(null)
    try {
      const res = await apiClient<BroadcastDryRunResponse>('/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          message: body.trim(),
          templateKey: templateKey.trim(),
          channel,
          target,
          siteId: target === 'SITE' ? scopeSiteId || undefined : undefined,
          unitId: target === 'UNIT' ? scopeUnitId || undefined : undefined,
          residentId: target === 'RESIDENT' ? scopeResidentId || undefined : undefined,
          dryRun: true,
        }),
      })
      setPreview(res)
      setMessage(`Dry-run tamam: ${res.recipientCount} alici bulundu.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dry-run basarisiz')
    } finally {
      setSending(false)
    }
  }

  const sendBroadcast = async () => {
    setSending(true)
    setError(null)
    setMessage(null)
    try {
      const res = await apiClient<BroadcastSendResponse>('/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          message: body.trim(),
          templateKey: templateKey.trim(),
          channel,
          target,
          siteId: target === 'SITE' ? scopeSiteId || undefined : undefined,
          unitId: target === 'UNIT' ? scopeUnitId || undefined : undefined,
          residentId: target === 'RESIDENT' ? scopeResidentId || undefined : undefined,
          dryRun: false,
        }),
      })
      setPreview(null)
      setMessage(`Gonderim tamam: ${res.createdCount}/${res.recipientCount} bildirim olusturuldu.`)
      await loadHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gonderim basarisiz')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Iletisim Merkezi"
        subtitle="Template mesaj gonderimi, hedef kitle secimi ve gonderim gecmisi."
        actions={(
          <button
            type="button"
            onClick={() => void loadHistory()}
            className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white"
          >
            Yenile
          </button>
        )}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="ledger-panel p-4 space-y-3">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Mesaj Hazirla</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="ledger-input bg-white"
            placeholder="Baslik"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="w-full ledger-input bg-white"
            placeholder="Mesaj icerigi"
          />
          <input
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
            className="ledger-input bg-white"
            placeholder="template key (ornek: manual.reminder)"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as BroadcastTarget)}
              className="ledger-input bg-white"
            >
              <option value="TENANT_ALL">Tum Tenant</option>
              <option value="SITE">Site Bazli</option>
              <option value="UNIT">Daire Bazli</option>
              <option value="RESIDENT">Sakin Bazli</option>
            </select>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as NotificationChannel)}
              className="ledger-input bg-white"
            >
              <option value={NotificationChannel.PUSH}>PUSH</option>
              <option value={NotificationChannel.SMS}>SMS</option>
              <option value={NotificationChannel.EMAIL}>EMAIL</option>
            </select>
          </div>
          {target === 'SITE' && (
            <input
              value={scopeSiteId}
              onChange={(e) => setScopeSiteId(e.target.value)}
              className="ledger-input bg-white"
              placeholder="Site ID"
            />
          )}
          {target === 'UNIT' && (
            <input
              value={scopeUnitId}
              onChange={(e) => setScopeUnitId(e.target.value)}
              className="ledger-input bg-white"
              placeholder="Unit ID"
            />
          )}
          {target === 'RESIDENT' && (
            <input
              value={scopeResidentId}
              onChange={(e) => setScopeResidentId(e.target.value)}
              className="ledger-input bg-white"
              placeholder="Resident ID"
            />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void runDryRun()}
              disabled={sending || !title.trim() || !body.trim()}
              className="px-3 py-2 rounded-md bg-[#e6e8ea] text-xs font-semibold text-[#0c1427] disabled:opacity-50"
            >
              Dry-Run
            </button>
            <button
              type="button"
              onClick={() => void sendBroadcast()}
              disabled={sending || !title.trim() || !body.trim()}
              className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white disabled:opacity-50"
            >
              Gonder
            </button>
          </div>
        </div>

        <div className="ledger-panel p-4 space-y-3">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Hedef Onizleme</p>
          {!preview && <p className="text-sm text-[#6b7280]">Dry-run sonrasi alici onizlemesi burada gorunecek.</p>}
          {preview && (
            <>
              <p className="text-sm text-[#0c1427]">Alici sayisi: <strong>{preview.recipientCount}</strong></p>
              <div className="max-h-56 overflow-auto space-y-2">
                {preview.preview.map((row) => (
                  <div key={`${row.residentId}-${row.unitId}`} className="rounded-md bg-[#f8f9fb] p-2">
                    <p className="text-sm font-semibold text-[#0c1427]">{row.residentName}</p>
                    <p className="text-xs text-[#6b7280]">Unit: {row.unitId}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="ledger-panel p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ledger-input bg-white md:col-span-2"
            placeholder="Template/sakin ara..."
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | NotificationStatus)}
            className="ledger-input bg-white"
          >
            <option value="ALL">Tum Durumlar</option>
            <option value={NotificationStatus.PENDING}>PENDING</option>
            <option value={NotificationStatus.SENT}>SENT</option>
            <option value={NotificationStatus.FAILED}>FAILED</option>
          </select>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as 'ALL' | NotificationChannel)}
            className="ledger-input bg-white"
          >
            <option value="ALL">Tum Kanallar</option>
            <option value={NotificationChannel.PUSH}>PUSH</option>
            <option value={NotificationChannel.SMS}>SMS</option>
            <option value={NotificationChannel.EMAIL}>EMAIL</option>
          </select>
        </div>
      </div>

      <div className="ledger-panel overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
          <span className="col-span-3">Alici</span>
          <span className="col-span-2">Site / Daire</span>
          <span className="col-span-2">Template</span>
          <span className="col-span-2">Kanal / Durum</span>
          <span className="col-span-2">Gonderen</span>
          <span className="col-span-1 text-right">Tarih</span>
        </div>
        <div className="ledger-divider">
          {loading && <p className="px-5 py-5 text-sm text-[#6b7280]">Yukleniyor...</p>}
          {!loading && history.length === 0 && (
            <p className="px-5 py-5 text-sm text-[#6b7280]">Gonderim gecmisi kaydi bulunamadi.</p>
          )}
          {!loading && history.map((row) => (
            <div key={row.id} className="grid grid-cols-12 px-5 py-3 items-center ledger-table-row-hover text-sm">
              <div className="col-span-3">
                <p className="font-semibold text-[#0c1427]">
                  {row.resident ? `${row.resident.firstName} ${row.resident.lastName}` : 'Kullanici atanmamis'}
                </p>
                <p className="text-xs text-[#6b7280]">{row.resident?.phoneNumber ?? '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[#0c1427]">{row.unit?.site.name ?? '-'}</p>
                <p className="text-xs text-[#6b7280]">{row.unit?.number ?? '-'}</p>
              </div>
              <p className="col-span-2 text-xs text-[#445266]">{row.templateKey ?? '-'}</p>
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-xs text-[#445266]">{row.channel}</span>
                <StaffStatusPill label={row.status} tone={statusTone(row.status)} />
              </div>
              <p className="col-span-2 text-xs text-[#445266]">{row.sentByUser?.displayName ?? row.sentByUser?.email ?? '-'}</p>
              <p className="col-span-1 text-right text-xs text-[#445266]">{formatDateTime(row.sentAt ?? row.createdAt)}</p>
            </div>
          ))}
        </div>
      </div>

      {historyMeta && (
        <p className="text-xs text-[#6b7280]">
          Toplam {historyMeta.total} kayit • Sayfa {historyMeta.page}/{Math.max(historyMeta.totalPages, 1)}
        </p>
      )}

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
