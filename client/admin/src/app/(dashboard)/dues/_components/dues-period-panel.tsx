'use client'

import { useState } from 'react'
import { DuesType } from '@sakin/shared'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { formatTry } from '@/lib/formatters'
import { toastSuccess } from '@/lib/toast'
import { Skeleton } from '@/components/ui/skeleton'

interface DuesPolicy {
  id: string
  name: string
  amount: string | number
  type: DuesType
  isActive: boolean
}

interface DuesPolicyListResponse {
  data: DuesPolicy[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

interface DuesPeriodPanelProps {
  siteId: string
}

const MONTH_NAMES = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

export function DuesPeriodPanel({ siteId }: DuesPeriodPanelProps) {
  const today = new Date()
  const [selectedPolicyId, setSelectedPolicyId] = useState('')
  const [periodMonth, setPeriodMonth] = useState<number>(today.getMonth() + 1)
  const [periodYear, setPeriodYear] = useState<number>(today.getFullYear())
  const [periodDescription, setPeriodDescription] = useState('')
  const [forceOverdue, setForceOverdue] = useState(true)

  const { data: policiesData, isLoading } = useApiQuery<DuesPolicyListResponse>(
    ['dues-policies', siteId],
    '/dues/policies',
    { siteId, page: 1, limit: 100 },
  )

  const activePolicies = (policiesData?.data ?? []).filter((p) => p.isActive)

  const openMutation = useApiMutation<
    { created: number; total: number; period: string },
    { siteId: string; policyId: string; periodMonth: number; periodYear: number; description?: string }
  >('/dues/period/open', {
    invalidateKeys: [['dues-list'], ['dues-policies'], ['work-summary']],
    onSuccess: (data) => {
      toastSuccess(`${data.period} dönemi açıldı: ${data.created}/${data.total} kayıt üretildi.`)
    },
  })

  const closeMutation = useApiMutation<
    { updated: number; period: string },
    { siteId: string; periodMonth: number; periodYear: number; forceOverdue: boolean }
  >('/dues/period/close', {
    invalidateKeys: [['dues-list'], ['work-summary']],
    onSuccess: (data) => {
      toastSuccess(`${data.period} dönemi kapatıldı. Güncellenen: ${data.updated} kayıt.`)
    },
  })

  const handleOpen = () => {
    if (!selectedPolicyId) return
    openMutation.mutate({
      siteId,
      policyId: selectedPolicyId,
      periodMonth,
      periodYear,
      description: periodDescription.trim() || undefined,
    })
  }

  const handleClose = () => {
    closeMutation.mutate({ siteId, periodMonth, periodYear, forceOverdue })
  }

  if (isLoading) {
    return <Skeleton className="h-64 rounded-lg" />
  }

  return (
    <div className="space-y-6">
      {/* Step-by-step wizard layout */}
      <div className="ledger-panel p-5 space-y-5">
        <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Dönem Açma Sihirbazı</p>

        {/* Step 1: Select Policy */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0c1427] text-white text-[10px] font-bold">1</span>
            <label className="text-sm font-semibold text-[#0c1427]">Aidat Tanımı Seçin</label>
          </div>
          <select
            value={selectedPolicyId}
            onChange={(e) => setSelectedPolicyId(e.target.value)}
            className="ledger-input bg-white w-full"
          >
            <option value="">Tanım seçiniz...</option>
            {activePolicies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.name} ({formatTry(Number(policy.amount))})
              </option>
            ))}
          </select>
          {activePolicies.length === 0 && (
            <p className="text-xs text-[#ba1a1a]">Aktif aidat tanımı yok. Önce &quot;Tanımlar&quot; sekmesinden oluşturun.</p>
          )}
        </div>

        {/* Step 2: Period */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0c1427] text-white text-[10px] font-bold">2</span>
            <label className="text-sm font-semibold text-[#0c1427]">Dönem Belirleyin</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={periodMonth}
              onChange={(e) => setPeriodMonth(Number(e.target.value))}
              className="ledger-input bg-white"
            >
              {MONTH_NAMES.slice(1).map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            <input
              type="number"
              min={2024}
              value={periodYear}
              onChange={(e) => setPeriodYear(Number(e.target.value))}
              className="ledger-input bg-white"
              placeholder="Yıl"
            />
          </div>
          <input
            value={periodDescription}
            onChange={(e) => setPeriodDescription(e.target.value)}
            className="ledger-input bg-white w-full"
            placeholder="Dönem açıklaması (opsiyonel)"
          />
        </div>

        {/* Step 3: Confirm */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0c1427] text-white text-[10px] font-bold">3</span>
            <label className="text-sm font-semibold text-[#0c1427]">Onaylayın</label>
          </div>

          {selectedPolicyId && (
            <div className="rounded-lg bg-[#f2f4f6] p-4">
              <p className="text-sm text-[#0c1427]">
                <strong>{activePolicies.find((p) => p.id === selectedPolicyId)?.name}</strong> tanımı ile{' '}
                <strong>{MONTH_NAMES[periodMonth]} {periodYear}</strong> dönemi açılacak.
              </p>
              <p className="text-xs text-[#6b7280] mt-1">
                Sitedeki tüm aktif daireler için borç kaydı oluşturulur.
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={openMutation.isPending || !selectedPolicyId}
            onClick={handleOpen}
            className="w-full px-4 py-3 rounded-lg ledger-gradient text-sm font-bold text-white uppercase tracking-tight disabled:opacity-50 transition-opacity"
          >
            {openMutation.isPending ? 'Dönem Açılıyor...' : 'Dönem Aç'}
          </button>
        </div>
      </div>

      {/* Period Close */}
      <div className="ledger-panel p-5 space-y-4">
        <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Dönem Kapatma</p>
        <p className="text-sm text-[#445266]">
          Seçili dönem ({MONTH_NAMES[periodMonth]} {periodYear}) için bekleyen/kısmi kayıtları kapatır.
        </p>
        <label className="text-xs text-[#445266] flex items-center gap-2">
          <input
            type="checkbox"
            checked={forceOverdue}
            onChange={(e) => setForceOverdue(e.target.checked)}
            className="h-4 w-4 rounded border-[#c5c6cd]"
          />
          Bekleyen/kısmi kayıtları gecikmiş olarak işaretle
        </label>
        <button
          type="button"
          disabled={closeMutation.isPending}
          onClick={handleClose}
          className="px-4 py-2.5 rounded-lg bg-[#e6e8ea] text-sm font-bold text-[#0c1427] hover:bg-[#dce0e3] disabled:opacity-50 transition-colors"
        >
          {closeMutation.isPending ? 'Kapatılıyor...' : 'Dönem Kapat'}
        </button>
      </div>
    </div>
  )
}
