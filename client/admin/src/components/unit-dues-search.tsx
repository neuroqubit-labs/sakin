'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, CreditCard, User } from 'lucide-react'
import { useApiQuery } from '@/hooks/use-api'
import { useDebounce } from '@/hooks/use-debounce'
import { useSiteContext } from '@/providers/site-provider'
import { apiClient } from '@/lib/api'
import { formatTry, formatShortDate, duesStatusLabel, duesStatusTone } from '@/lib/formatters'
import { StatusPill } from '@/components/surface'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UnitDuesSearchResult {
  duesId: string
  unitId: string
  unitNumber: string
  siteName: string
  residentName: string | null
  amount: number
  paidAmount: number
  remainingAmount: number
  periodMonth: number
  periodYear: number
  status: string
  dueDate: string
}

interface UnitSearchItem {
  id: string
  number: string
  floor: number | null
  site: { name: string }
  residents: Array<{ firstName: string; lastName: string; type: string }>
  financial: {
    openDebt: number
    status: string
  }
}

interface UnitSearchResponse {
  data: UnitSearchItem[]
  meta: { total: number }
}

interface UnitDetailDues {
  id: string
  periodMonth: number
  periodYear: number
  amount: string | number
  paidAmount: string | number
  status: string
  dueDate: string
}

interface UnitDetailResponse {
  id: string
  number: string
  site: { name: string }
  residents: Array<{ firstName: string; lastName: string; type: string }>
  dues: UnitDetailDues[]
}

interface DuesPreviewResponse {
  id: string
  amount: string | number
  paidAmount: string | number
  status: string
  periodMonth: number
  periodYear: number
  dueDate: string
  unit: {
    id: string
    number: string
    site: { name: string }
  }
}

interface UnitDuesSearchProps {
  onSelect: (result: UnitDuesSearchResult) => void
  initialDuesId?: string
  initialUnitId?: string
  siteId?: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function toNumber(v: string | number): number {
  return typeof v === 'string' ? Number(v) : v
}

const MONTH_NAMES = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const OPEN_STATUSES = new Set(['PENDING', 'OVERDUE', 'PARTIALLY_PAID'])

function getResidentName(residents: Array<{ firstName: string; lastName: string }>): string | null {
  const first = residents[0]
  if (!first) return null
  return `${first.firstName} ${first.lastName}`
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function UnitDuesSearch({ onSelect, initialDuesId, initialUnitId, siteId: siteIdProp }: UnitDuesSearchProps) {
  const { selectedSiteId } = useSiteContext()
  const activeSiteId = siteIdProp ?? selectedSiteId

  // Stage management
  const [selectedUnit, setSelectedUnit] = useState<UnitSearchItem | null>(null)
  const [selectedDuesId, setSelectedDuesId] = useState<string | null>(null)
  const [unitPopoverOpen, setUnitPopoverOpen] = useState(false)

  // Unit search
  const [unitQuery, setUnitQuery] = useState('')
  const debouncedQuery = useDebounce(unitQuery, 300)

  const { data: unitSearchData, isLoading: unitSearchLoading } = useApiQuery<UnitSearchResponse>(
    ['unit-search', { search: debouncedQuery, siteId: activeSiteId }],
    '/units',
    {
      search: debouncedQuery || undefined,
      siteId: activeSiteId ?? undefined,
      limit: 10,
      page: 1,
      isActive: true,
    },
    { enabled: debouncedQuery.length >= 1 || !selectedUnit },
  )

  // Unit detail (for dues list after unit selection)
  const { data: unitDetail, isLoading: unitDetailLoading } = useApiQuery<UnitDetailResponse>(
    ['unit-detail-for-payment', selectedUnit?.id],
    `/units/${selectedUnit?.id}`,
    undefined,
    { enabled: !!selectedUnit?.id },
  )

  // Open dues from the selected unit
  const openDues = useMemo(() => {
    if (!unitDetail?.dues) return []
    return unitDetail.dues
      .filter((d) => OPEN_STATUSES.has(d.status))
      .sort((a, b) => {
        // Sort: OVERDUE first, then by date
        if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1
        if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
  }, [unitDetail?.dues])

  // Bootstrap from initialDuesId (e.g., coming from unit detail page)
  useEffect(() => {
    if (!initialDuesId) return
    let active = true

    async function bootstrap() {
      try {
        const dues = await apiClient<DuesPreviewResponse>(`/dues/${initialDuesId}`)
        if (!active) return

        const remaining = Math.max(0, toNumber(dues.amount) - toNumber(dues.paidAmount))

        // Set the unit as selected
        setSelectedUnit({
          id: dues.unit.id,
          number: dues.unit.number,
          floor: null,
          site: dues.unit.site,
          residents: [],
          financial: { openDebt: remaining, status: dues.status },
        })
        setSelectedDuesId(dues.id)

        // Fire onSelect immediately
        onSelect({
          duesId: dues.id,
          unitId: dues.unit.id,
          unitNumber: dues.unit.number,
          siteName: dues.unit.site.name,
          residentName: null,
          amount: toNumber(dues.amount),
          paidAmount: toNumber(dues.paidAmount),
          remainingAmount: remaining,
          periodMonth: dues.periodMonth,
          periodYear: dues.periodYear,
          status: dues.status,
          dueDate: dues.dueDate,
        })
      } catch {
        // silently fail — user can search manually
      }
    }

    void bootstrap()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDuesId])

  // Bootstrap from initialUnitId
  useEffect(() => {
    if (!initialUnitId || initialDuesId) return
    let active = true

    async function bootstrap() {
      try {
        const unit = await apiClient<UnitDetailResponse>(`/units/${initialUnitId}`)
        if (!active) return
        const firstResident = getResidentName(unit.residents)
        setSelectedUnit({
          id: unit.id,
          number: unit.number,
          floor: null,
          site: unit.site,
          residents: unit.residents,
          financial: { openDebt: 0, status: 'DEBTOR' },
        })
        // Don't auto-select dues — let user pick
      } catch {
        // silently fail
      }
    }

    void bootstrap()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUnitId])

  // When a dues is selected from the list
  const handleDuesSelect = useCallback(
    (dues: UnitDetailDues) => {
      if (!selectedUnit || !unitDetail) return

      const amount = toNumber(dues.amount)
      const paidAmount = toNumber(dues.paidAmount)
      const remaining = Math.max(0, amount - paidAmount)
      const residentName = getResidentName(unitDetail.residents)

      setSelectedDuesId(dues.id)

      onSelect({
        duesId: dues.id,
        unitId: selectedUnit.id,
        unitNumber: selectedUnit.number,
        siteName: unitDetail.site.name,
        residentName,
        amount,
        paidAmount,
        remainingAmount: remaining,
        periodMonth: dues.periodMonth,
        periodYear: dues.periodYear,
        status: dues.status,
        dueDate: dues.dueDate,
      })
    },
    [selectedUnit, unitDetail, onSelect],
  )

  // When a unit is selected from the search
  const handleUnitSelect = useCallback(
    (unit: UnitSearchItem) => {
      setSelectedUnit(unit)
      setSelectedDuesId(null)
      setUnitPopoverOpen(false)
      setUnitQuery('')
    },
    [],
  )

  // Reset unit selection
  const handleUnitClear = useCallback(() => {
    setSelectedUnit(null)
    setSelectedDuesId(null)
    setUnitQuery('')
  }, [])

  const unitItems = unitSearchData?.data ?? []

  return (
    <div className="space-y-4">
      {/* Stage 1: Unit Search */}
      <div className="space-y-2">
        <label className="px-1 text-[11px] font-black uppercase tracking-[0.15em] text-[#6e7882]">
          Daire Seçimi
        </label>

        {selectedUnit ? (
          <div className="flex items-center justify-between rounded-lg bg-[#f2f4f6] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0c1427] text-white">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0c1427]">
                  Daire {selectedUnit.number}
                </p>
                <p className="text-xs text-[#6b7280]">
                  {selectedUnit.site.name}
                  {selectedUnit.residents[0] && ` · ${getResidentName(selectedUnit.residents)}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUnitClear}
              className="text-xs font-bold text-[#6b7280] hover:text-[#ba1a1a] transition-colors"
            >
              Değiştir
            </button>
          </div>
        ) : (
          <Popover open={unitPopoverOpen} onOpenChange={setUnitPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                role="combobox"
                aria-expanded={unitPopoverOpen}
                className="flex h-11 w-full items-center gap-2 rounded-lg bg-[#e6e8ea] px-4 text-sm text-[#9ca3af] hover:bg-[#dce0e3] transition-colors"
              >
                <Building2 className="h-4 w-4" />
                <span>Daire numarası veya sakin adı ile arayın...</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Daire no veya sakin adı..."
                  value={unitQuery}
                  onValueChange={setUnitQuery}
                />
                <CommandList>
                  {unitSearchLoading ? (
                    <div className="py-4 text-center text-xs text-[#6b7280]">Aranıyor...</div>
                  ) : (
                    <>
                      <CommandEmpty>
                        {debouncedQuery.length < 1
                          ? 'Aramaya başlamak için yazın...'
                          : 'Sonuç bulunamadı.'}
                      </CommandEmpty>
                      <CommandGroup heading="Daireler">
                        {unitItems.map((unit) => (
                          <CommandItem
                            key={unit.id}
                            value={unit.id}
                            onSelect={() => handleUnitSelect(unit)}
                          >
                            <div className="flex w-full items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[#f2f4f6] text-[10px] font-bold text-[#0c1427]">
                                  {unit.number}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[#0c1427] truncate">
                                    {unit.site.name} — Daire {unit.number}
                                  </p>
                                  <p className="text-xs text-[#6b7280] truncate">
                                    {unit.residents[0]
                                      ? `${unit.residents[0].firstName} ${unit.residents[0].lastName}`
                                      : 'Sakin atanmamış'}
                                  </p>
                                </div>
                              </div>
                              {unit.financial.openDebt > 0 && (
                                <span className="shrink-0 text-xs font-bold text-[#ba1a1a] tabular-nums">
                                  {formatTry(unit.financial.openDebt)}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Stage 2: Dues Selection */}
      {selectedUnit && (
        <div className="space-y-2">
          <label className="px-1 text-[11px] font-black uppercase tracking-[0.15em] text-[#6e7882]">
            Borç Seçimi
          </label>

          {unitDetailLoading ? (
            <div className="rounded-lg bg-[#f2f4f6] p-4 text-center text-xs text-[#6b7280]">
              Borçlar yükleniyor...
            </div>
          ) : openDues.length === 0 ? (
            <div className="rounded-lg bg-[#f2f4f6] p-4 text-center text-xs text-[#6b7280]">
              Bu dairenin açık borcu bulunmuyor.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {openDues.map((dues) => {
                const remaining = Math.max(0, toNumber(dues.amount) - toNumber(dues.paidAmount))
                const isSelected = selectedDuesId === dues.id

                return (
                  <button
                    key={dues.id}
                    type="button"
                    onClick={() => handleDuesSelect(dues)}
                    className={cn(
                      'w-full rounded-lg px-4 py-3 text-left transition-all',
                      isSelected
                        ? 'bg-[#0c1427] text-white shadow-md'
                        : 'bg-[#f2f4f6] text-[#0c1427] hover:bg-[#e6e8ea]',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className={cn('h-3.5 w-3.5', isSelected ? 'text-white/70' : 'text-[#6b7280]')} />
                        <span className="text-sm font-bold">
                          {MONTH_NAMES[dues.periodMonth]} {dues.periodYear}
                        </span>
                      </div>
                      <span className={cn('text-sm font-black tabular-nums', isSelected ? 'text-white' : 'text-[#ba1a1a]')}>
                        {formatTry(remaining)}
                      </span>
                    </div>
                    <div className={cn('mt-1 flex items-center justify-between text-xs', isSelected ? 'text-white/60' : 'text-[#6b7280]')}>
                      <span>Vade: {formatShortDate(dues.dueDate)}</span>
                      <StatusPill
                        label={duesStatusLabel(dues.status)}
                        tone={isSelected ? 'neutral' : duesStatusTone(dues.status)}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
