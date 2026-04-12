'use client'

import { useEffect, useMemo, useState } from 'react'
import { StaffPageHeader } from '@/components/staff-surface'
import { StaffStatusPill } from '@/components/staff-surface'
import { apiClient } from '@/lib/api'
import { duesStatusLabel, duesStatusTone, formatShortDate, formatTry } from '@/lib/work-presenters'
import { useAuth } from '@/providers/auth-provider'
import { useSiteContext } from '@/providers/site-provider'
import { DuesType, UserRole } from '@sakin/shared'

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
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface DuesRow {
  id: string
  amount: string | number
  paidAmount: string | number
  remainingAmount: string | number
  status: string
  periodMonth: number
  periodYear: number
  dueDate: string
  description?: string | null
  unit: { number: string; floor: number | null; site: { name: string } }
}

interface DuesListResponse {
  data: DuesRow[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export default function DuesPage() {
  const { role } = useAuth()
  const { selectedSiteId, hydrated } = useSiteContext()
  const isTenantAdmin = role === UserRole.TENANT_ADMIN

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [policyRows, setPolicyRows] = useState<DuesPolicy[]>([])
  const [duesRows, setDuesRows] = useState<DuesRow[]>([])

  const [policyName, setPolicyName] = useState('')
  const [policyAmount, setPolicyAmount] = useState<number>(1500)
  const [policyDueDay, setPolicyDueDay] = useState<number>(10)
  const [policyType, setPolicyType] = useState<DuesType>(DuesType.AIDAT)
  const [policyDescription, setPolicyDescription] = useState('')

  const [selectedPolicyId, setSelectedPolicyId] = useState('')
  const today = new Date()
  const [periodMonth, setPeriodMonth] = useState<number>(today.getMonth() + 1)
  const [periodYear, setPeriodYear] = useState<number>(today.getFullYear())
  const [periodDescription, setPeriodDescription] = useState('')
  const [forceOverdue, setForceOverdue] = useState(true)

  const [statusFilter, setStatusFilter] = useState('ALL')

  const openAmount = useMemo(
    () => duesRows.reduce((sum, row) => sum + Math.max(0, Number(row.remainingAmount)), 0),
    [duesRows],
  )
  const overdueCount = useMemo(
    () => duesRows.filter((row) => row.status === 'OVERDUE').length,
    [duesRows],
  )
  const waiveQueue = useMemo(
    () => duesRows.filter((row) => row.status === 'PENDING' || row.status === 'OVERDUE'),
    [duesRows],
  )

  const loadData = async () => {
    if (!hydrated || !selectedSiteId) return
    setLoading(true)
    setError(null)
    try {
      const [policies, dues] = await Promise.all([
        apiClient<DuesPolicyListResponse>('/dues/policies', {
          params: {
            siteId: selectedSiteId,
            isActive: undefined,
            page: 1,
            limit: 100,
          },
        }),
        apiClient<DuesListResponse>('/dues', {
          params: {
            siteId: selectedSiteId,
            status: statusFilter === 'ALL' ? undefined : statusFilter,
            page: 1,
            limit: 200,
          },
        }),
      ])
      setPolicyRows(policies.data)
      setDuesRows(dues.data)
      setSelectedPolicyId((prev) => prev || policies.data[0]?.id || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aidat verileri yuklenemedi')
      setPolicyRows([])
      setDuesRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hydrated || !selectedSiteId) return
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, selectedSiteId, statusFilter])

  const createPolicy = async () => {
    if (!isTenantAdmin || !selectedSiteId || !policyName.trim()) return
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      await apiClient<DuesPolicy>('/dues/policies', {
        method: 'POST',
        body: JSON.stringify({
          siteId: selectedSiteId,
          name: policyName.trim(),
          amount: policyAmount,
          currency: 'TRY',
          type: policyType,
          dueDay: policyDueDay,
          isActive: true,
          description: policyDescription.trim() || undefined,
        }),
      })
      setMessage('Aidat policy olusturuldu.')
      setPolicyName('')
      setPolicyDescription('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Policy olusturulamadi')
    } finally {
      setLoading(false)
    }
  }

  const togglePolicyActive = async (policy: DuesPolicy) => {
    if (!isTenantAdmin) return
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      await apiClient<DuesPolicy>(`/dues/policies/${policy.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: !policy.isActive,
        }),
      })
      setMessage('Policy durumu guncellendi.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Policy guncellenemedi')
    } finally {
      setLoading(false)
    }
  }

  const openPeriod = async () => {
    if (!isTenantAdmin || !selectedSiteId || !selectedPolicyId) return
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const response = await apiClient<{ created: number; total: number; period: string }>('/dues/period/open', {
        method: 'POST',
        body: JSON.stringify({
          siteId: selectedSiteId,
          policyId: selectedPolicyId,
          periodMonth,
          periodYear,
          description: periodDescription.trim() || undefined,
        }),
      })
      setMessage(`${response.period} donemi acildi: ${response.created}/${response.total} kayit uretildi.`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Donem acilamadi')
    } finally {
      setLoading(false)
    }
  }

  const closePeriod = async () => {
    if (!isTenantAdmin || !selectedSiteId) return
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const response = await apiClient<{ updated: number; period: string }>('/dues/period/close', {
        method: 'POST',
        body: JSON.stringify({
          siteId: selectedSiteId,
          periodMonth,
          periodYear,
          forceOverdue,
        }),
      })
      setMessage(`${response.period} donemi kapatma islemi tamamlandi. Guncellenen kayit: ${response.updated}.`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Donem kapatilamadi')
    } finally {
      setLoading(false)
    }
  }

  const waiveDues = async (duesId: string) => {
    if (!isTenantAdmin) return
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      await apiClient(`/dues/${duesId}/waive`, {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Tenant admin manuel waive islemi',
        }),
      })
      setMessage('Aidat kaydi WAIVED olarak guncellendi.')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Waive islemi basarisiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <StaffPageHeader
        title="Aidatlar"
        subtitle="Policy, donem governance ve aidat mutabakat operasyonlari."
        actions={
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white"
          >
            Yenile
          </button>
        }
      />

      {!selectedSiteId && hydrated && (
        <div className="ledger-panel p-6">
          <p className="text-sm text-[#6b7280]">Aidat yonetimi icin once bir site secin.</p>
        </div>
      )}

      {!isTenantAdmin && (
        <div className="ledger-panel p-6">
          <p className="text-sm text-[#6b7280]">Bu governance ekrani yalnizca TENANT_ADMIN rolune aciktir. STAFF operasyonu Action Center altinda devam eder.</p>
        </div>
      )}

      {selectedSiteId && isTenantAdmin && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="ledger-panel p-4">
              <p className="ledger-label">Aktif Policy</p>
              <p className="ledger-value mt-2">{policyRows.filter((p) => p.isActive).length}</p>
            </div>
            <div className="ledger-panel p-4">
              <p className="ledger-label">Acik Bakiye</p>
              <p className="ledger-value mt-2">{formatTry(openAmount)}</p>
            </div>
            <div className="ledger-panel p-4">
              <p className="ledger-label">Gecikmis Kayit</p>
              <p className="ledger-value mt-2">{overdueCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="ledger-panel p-4 space-y-3">
              <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Policy Yonetimi</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  className="ledger-input bg-white"
                  placeholder="Policy adi"
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
                  placeholder="Vade gunu"
                />
                <select
                  value={policyType}
                  onChange={(e) => setPolicyType(e.target.value as DuesType)}
                  className="ledger-input bg-white"
                >
                  <option value={DuesType.AIDAT}>AIDAT</option>
                  <option value={DuesType.EXTRA}>EXTRA</option>
                </select>
              </div>
              <input
                value={policyDescription}
                onChange={(e) => setPolicyDescription(e.target.value)}
                className="ledger-input bg-white"
                placeholder="Aciklama (opsiyonel)"
              />
              <button
                type="button"
                disabled={loading || !policyName.trim()}
                onClick={() => void createPolicy()}
                className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white disabled:opacity-50"
              >
                Policy Ekle
              </button>
              <div className="space-y-2 max-h-52 overflow-auto">
                {policyRows.map((policy) => (
                  <div key={policy.id} className="rounded-md bg-[#f8f9fb] p-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#0c1427]">{policy.name}</p>
                      <p className="text-xs text-[#6b7280]">
                        {formatTry(Number(policy.amount))} • Vade: {policy.dueDay} • {policy.type}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void togglePolicyActive(policy)}
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        policy.isActive
                          ? 'bg-[#ffe7e7] text-[#ba1a1a]'
                          : 'bg-[#d8f7dd] text-[#006e2d]'
                      }`}
                    >
                      {policy.isActive ? 'Pasife Al' : 'Aktif Et'}
                    </button>
                  </div>
                ))}
                {policyRows.length === 0 && (
                  <p className="text-xs text-[#6b7280]">Bu site icin policy kaydi bulunamadi.</p>
                )}
              </div>
            </div>

            <div className="ledger-panel p-4 space-y-3">
              <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Donem Governance</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <select
                  value={selectedPolicyId}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                  className="ledger-input bg-white md:col-span-2"
                >
                  <option value="">Policy secin</option>
                  {policyRows.filter((p) => p.isActive).map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.name} ({formatTry(Number(policy.amount))})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(Number(e.target.value))}
                  className="ledger-input bg-white"
                  placeholder="Ay"
                />
                <input
                  type="number"
                  min={2024}
                  value={periodYear}
                  onChange={(e) => setPeriodYear(Number(e.target.value))}
                  className="ledger-input bg-white"
                  placeholder="Yil"
                />
              </div>
              <input
                value={periodDescription}
                onChange={(e) => setPeriodDescription(e.target.value)}
                className="ledger-input bg-white"
                placeholder="Donem aciklamasi (opsiyonel)"
              />
              <label className="text-xs text-[#445266] flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={forceOverdue}
                  onChange={(e) => setForceOverdue(e.target.checked)}
                />
                Kapatirken bekleyen/kismi kayitlari OVERDUE yap
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading || !selectedPolicyId}
                  onClick={() => void openPeriod()}
                  className="px-3 py-2 rounded-md ledger-gradient text-xs font-semibold text-white disabled:opacity-50"
                >
                  Donem Ac
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void closePeriod()}
                  className="px-3 py-2 rounded-md bg-[#e6e8ea] text-xs font-semibold text-[#0c1427] disabled:opacity-50"
                >
                  Donem Kapat
                </button>
              </div>
            </div>
          </div>

          <div className="ledger-panel overflow-hidden">
            <div className="px-5 py-4 bg-[#f2f4f6] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-[#0c1427]">Aidat Kayitlari</h2>
                <p className="text-xs text-[#6b7280] mt-1">Mutabakat ve waive queue</p>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="ledger-input bg-white text-xs"
              >
                <option value="ALL">Tum Durumlar</option>
                <option value="PENDING">PENDING</option>
                <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                <option value="OVERDUE">OVERDUE</option>
                <option value="PAID">PAID</option>
                <option value="WAIVED">WAIVED</option>
              </select>
            </div>

            <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
              <span className="col-span-2">Daire</span>
              <span className="col-span-2">Donem</span>
              <span className="col-span-2 text-right">Tutar</span>
              <span className="col-span-2 text-right">Kalan</span>
              <span className="col-span-2">Durum</span>
              <span className="col-span-1">Vade</span>
              <span className="col-span-1 text-right">Aksiyon</span>
            </div>

            <div className="ledger-divider">
              {duesRows.map((row) => (
                <div key={row.id} className="grid grid-cols-12 px-5 py-3 items-center text-sm ledger-table-row-hover">
                  <div className="col-span-2">
                    <p className="font-semibold text-[#0c1427]">{row.unit.number}</p>
                    <p className="text-[11px] text-[#6b7280]">{row.unit.site.name}</p>
                  </div>
                  <span className="col-span-2 tabular-nums">{row.periodMonth}/{row.periodYear}</span>
                  <span className="col-span-2 text-right tabular-nums">{formatTry(Number(row.amount))}</span>
                  <span className="col-span-2 text-right tabular-nums">{formatTry(Number(row.remainingAmount))}</span>
                  <span className="col-span-2">
                    <StaffStatusPill label={duesStatusLabel(row.status)} tone={duesStatusTone(row.status)} />
                  </span>
                  <span className="col-span-1 text-xs">{formatShortDate(row.dueDate)}</span>
                  <div className="col-span-1 text-right">
                    {(row.status === 'PENDING' || row.status === 'OVERDUE') && (
                      <button
                        type="button"
                        onClick={() => void waiveDues(row.id)}
                        className="text-xs font-bold text-[#ba1a1a]"
                      >
                        Waive
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!loading && duesRows.length === 0 && (
                <p className="px-5 py-5 text-sm text-[#6b7280]">Secili filtreye uygun aidat kaydi bulunamadi.</p>
              )}
            </div>
          </div>

          <div className="ledger-panel p-4">
            <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Suspicious / Waive Queue</p>
            <p className="text-sm text-[#445266] mt-2">
              Manuel inceleme bekleyen kayit: <strong>{waiveQueue.length}</strong>
            </p>
          </div>
        </>
      )}

      {loading && (
        <div className="ledger-panel p-3">
          <p className="text-xs text-[#6b7280]">Islem suruyor...</p>
        </div>
      )}

      {message && (
        <div className="ledger-panel p-3">
          <p className="text-sm text-green-700">{message}</p>
        </div>
      )}

      {error && (
        <div className="ledger-panel p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
