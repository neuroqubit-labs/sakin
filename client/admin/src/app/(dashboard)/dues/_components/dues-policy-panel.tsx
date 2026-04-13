'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DuesType } from '@sakin/shared'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { apiClient } from '@/lib/api'
import { formatTry } from '@/lib/formatters'
import { toastSuccess, toastError } from '@/lib/toast'
import { Skeleton } from '@/components/ui/skeleton'

interface DuesPolicy {
  id: string
  siteId: string
  name: string
  amount: string | number
  currency: string
  type: DuesType
  dueDay: number
  isActive: boolean
  description?: string | null
  site: { id: string; name: string; city: string }
}

interface DuesPolicyListResponse {
  data: DuesPolicy[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

interface DuesPolicyPanelProps {
  siteId: string
}

export function DuesPolicyPanel({ siteId }: DuesPolicyPanelProps) {
  const queryClient = useQueryClient()
  const [policyName, setPolicyName] = useState('')
  const [policyAmount, setPolicyAmount] = useState<number>(1500)
  const [policyDueDay, setPolicyDueDay] = useState<number>(10)
  const [policyType, setPolicyType] = useState<DuesType>(DuesType.AIDAT)
  const [policyDescription, setPolicyDescription] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { data: policiesData, isLoading } = useApiQuery<DuesPolicyListResponse>(
    ['dues-policies', siteId],
    '/dues/policies',
    { siteId, page: 1, limit: 100 },
  )

  const policies = policiesData?.data ?? []

  const createMutation = useApiMutation<DuesPolicy, {
    siteId: string
    name: string
    amount: number
    currency: string
    type: DuesType
    dueDay: number
    isActive: boolean
    description?: string
  }>('/dues/policies', {
    invalidateKeys: [['dues-policies']],
    onSuccess: () => {
      toastSuccess('Aidat tanımı oluşturuldu.')
      setPolicyName('')
      setPolicyDescription('')
    },
  })

  const handleCreate = () => {
    if (!policyName.trim()) return
    createMutation.mutate({
      siteId,
      name: policyName.trim(),
      amount: policyAmount,
      currency: 'TRY',
      type: policyType,
      dueDay: policyDueDay,
      isActive: true,
      description: policyDescription.trim() || undefined,
    })
  }

  const handleToggle = async (policy: DuesPolicy) => {
    setTogglingId(policy.id)
    try {
      await apiClient(`/dues/policies/${policy.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !policy.isActive }),
      })
      toastSuccess('Tanım durumu güncellendi.')
      await queryClient.invalidateQueries({ queryKey: ['dues-policies'] })
    } catch (err) {
      toastError(err instanceof Error ? err : new Error('Tanım güncellenemedi'))
    } finally {
      setTogglingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create Form */}
      <div className="ledger-panel p-5 space-y-4">
        <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Yeni Aidat Tanımı</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={policyName}
            onChange={(e) => setPolicyName(e.target.value)}
            className="ledger-input bg-white"
            placeholder="Tanım adı (ör: Aylık Aidat)"
          />
          <input
            type="number"
            min={1}
            step={0.01}
            value={policyAmount}
            onChange={(e) => setPolicyAmount(Number(e.target.value))}
            className="ledger-input bg-white"
            placeholder="Tutar"
          />
          <input
            type="number"
            min={1}
            max={28}
            value={policyDueDay}
            onChange={(e) => setPolicyDueDay(Number(e.target.value))}
            className="ledger-input bg-white"
            placeholder="Vade günü"
          />
          <select
            value={policyType}
            onChange={(e) => setPolicyType(e.target.value as DuesType)}
            className="ledger-input bg-white"
          >
            <option value={DuesType.AIDAT}>Aidat</option>
            <option value={DuesType.EXTRA}>Ek Ücret</option>
          </select>
        </div>
        <input
          value={policyDescription}
          onChange={(e) => setPolicyDescription(e.target.value)}
          className="ledger-input bg-white"
          placeholder="Açıklama (opsiyonel)"
        />
        <button
          type="button"
          disabled={createMutation.isPending || !policyName.trim()}
          onClick={handleCreate}
          className="px-4 py-2.5 rounded-lg ledger-gradient text-xs font-bold text-white uppercase tracking-tight disabled:opacity-50 transition-opacity"
        >
          {createMutation.isPending ? 'Oluşturuluyor...' : 'Tanım Ekle'}
        </button>
      </div>

      {/* Policies List */}
      <div className="ledger-panel overflow-hidden">
        <div className="px-5 py-4 bg-[#f2f4f6]">
          <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Mevcut Tanımlar</h2>
          <p className="text-xs text-[#6b7280] mt-1">{policies.filter((p) => p.isActive).length} aktif, {policies.filter((p) => !p.isActive).length} pasif</p>
        </div>
        <div className="ledger-divider">
          {policies.map((policy) => (
            <div key={policy.id} className="px-5 py-3 flex items-center justify-between ledger-table-row-hover">
              <div>
                <p className="text-sm font-semibold text-[#0c1427]">{policy.name}</p>
                <p className="text-xs text-[#6b7280]">
                  {formatTry(Number(policy.amount))} · Vade: {policy.dueDay}. gün · {policy.type === DuesType.AIDAT ? 'Aidat' : 'Ek Ücret'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleToggle(policy)}
                disabled={togglingId === policy.id}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  policy.isActive
                    ? 'bg-[#ffe7e7] text-[#ba1a1a] hover:bg-[#ffd6d6]'
                    : 'bg-[#d8f7dd] text-[#006e2d] hover:bg-[#c0f0c8]'
                } disabled:opacity-50`}
              >
                {togglingId === policy.id ? '...' : policy.isActive ? 'Pasife Al' : 'Aktif Et'}
              </button>
            </div>
          ))}
          {policies.length === 0 && (
            <p className="px-5 py-5 text-sm text-[#6b7280]">Bu site için aidat tanımı bulunamadı.</p>
          )}
        </div>
      </div>
    </div>
  )
}
