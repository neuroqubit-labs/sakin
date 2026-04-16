'use client'

import { useMemo, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateOccupancySchema, CreateResidentSchema, type CreateOccupancyDto, type CreateResidentDto, OccupancyRole, ResidentType } from '@sakin/shared'
import { Building2, CreditCard, Search, Star, UserPlus, Users, Wallet, LogOut, ExternalLink } from 'lucide-react'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { EmptyState } from '@/components/empty-state'
import { KpiCard, PageHeader, SectionTitle, StatusPill } from '@/components/surface'
import { Breadcrumb } from '@/components/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PaymentCollectModal } from '@/components/payment-collect-modal'
import {
  duesStatusLabel,
  duesStatusTone,
  formatDateTime,
  formatShortDate,
  formatTry,
  paymentMethodLabel,
} from '@/lib/formatters'
import { toastSuccess } from '@/lib/toast'

// ─── Types ───────────────────────────────────────────────────────────────────

interface UnitDetail {
  id: string
  number: string
  floor: number | null
  type: string
  area: number | null
  site: { name: string; city: string }
  block: { name: string } | null
  residents: Array<{
    id: string
    firstName: string
    lastName: string
    phoneNumber: string
    type: string
  }>
  dues: Array<{
    id: string
    periodMonth: number
    periodYear: number
    amount: string | number
    paidAmount: string | number
    status: string
    dueDate: string
    payments?: Array<{
      id: string
      amount: string | number
      method: string
      paidAt: string | null
      note?: string | null
    }>
  }>
}

interface OccupancyRow {
  id: string
  role: 'OWNER' | 'TENANT' | 'RESPONSIBLE' | 'CONTACT'
  isPrimaryResponsible: boolean
  startDate: string
  endDate: string | null
  isActive: boolean
  note: string | null
  resident: {
    id: string
    firstName: string
    lastName: string
    phoneNumber: string
    email: string | null
    type: string
  }
}

interface OccupancyListResponse {
  data: OccupancyRow[]
  meta: { total: number }
}

interface ResidentSearchRow {
  id: string
  firstName: string
  lastName: string
  phoneNumber: string
  email: string | null
  type: string
}

interface ResidentSearchResponse {
  data: ResidentSearchRow[]
}

interface LedgerRow {
  id: string
  date: Date | null
  type: 'CHARGE' | 'PAYMENT'
  title: string
  subtitle: string
  charge: number
  payment: number
  status: string
}

interface AuditLogEntry {
  id: string
  action: string
  entity: string
  entityId: string
  changes: Record<string, unknown> | null
  performedBy: string
  createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Ev Sahibi',
  TENANT: 'Kiracı',
  RESPONSIBLE: 'Sorumlu',
  CONTACT: 'İletişim Kişisi',
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-blue-100 text-blue-700',
  TENANT: 'bg-green-100 text-green-700',
  RESPONSIBLE: 'bg-orange-100 text-orange-700',
  CONTACT: 'bg-gray-100 text-gray-700',
}

const ACTION_LABELS: Record<string, string> = {
  'payment.manual.confirmed': 'Nakit/POS Tahsilat',
  'payment.bank_transfer.confirmed': 'Banka Transferi Onaylandı',
  'payment.bank_transfer.rejected': 'Transfer Reddedildi',
}

function toNumber(v: string | number) {
  return typeof v === 'string' ? Number(v) : v
}

// ─── Occupancy Panel ─────────────────────────────────────────────────────────

function OccupancyPanel({ unitId }: { unitId: string }) {
  const queryClient = useQueryClient()

  const [endingId, setEndingId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [residentSearch, setResidentSearch] = useState('')
  const [selectedResident, setSelectedResident] = useState<ResidentSearchRow | null>(null)
  const [showNewResidentForm, setShowNewResidentForm] = useState(false)
  const [showPastOccupancies, setShowPastOccupancies] = useState(false)

  const { data: occupanciesRes, isLoading } = useApiQuery<OccupancyListResponse>(
    ['occupancies', unitId],
    '/occupancies',
    { unitId, limit: 50 },
    { enabled: !!unitId },
  )
  const all = occupanciesRes?.data ?? []
  const active = all.filter((o) => o.isActive)
  const past = all.filter((o) => !o.isActive)

  // Resident search — only runs when sheet is open and search has value
  const { data: searchRes } = useApiQuery<ResidentSearchResponse>(
    ['resident-search', residentSearch],
    '/residents',
    { search: residentSearch, limit: 10 },
    { enabled: sheetOpen && residentSearch.length >= 2 },
  )
  const searchResults = searchRes?.data ?? []

  // Occupancy form
  const occupancyForm = useForm<CreateOccupancyDto>({
    resolver: zodResolver(CreateOccupancySchema),
    defaultValues: {
      unitId,
      residentId: '',
      role: OccupancyRole.OWNER,
      isPrimaryResponsible: false,
      startDate: new Date(),
    },
  })

  // New resident form
  const newResidentForm = useForm<CreateResidentDto>({
    resolver: zodResolver(CreateResidentSchema),
    defaultValues: { firstName: '', lastName: '', phoneNumber: '', type: ResidentType.OWNER },
  })

  // Mutations
  const createOccupancyMutation = useApiMutation<OccupancyRow, CreateOccupancyDto>('/occupancies', {
    invalidateKeys: [['occupancies', unitId], ['unit-detail', unitId]],
    onSuccess: () => {
      toastSuccess('Sakin atandı.')
      setSheetOpen(false)
      setSelectedResident(null)
      setResidentSearch('')
      occupancyForm.reset({ unitId, residentId: '', role: OccupancyRole.OWNER, isPrimaryResponsible: false, startDate: new Date() })
    },
  })

  const endOccupancyMutation = useApiMutation<unknown, { id: string }>(
    (vars) => `/occupancies/${vars.id}/end`,
    {
      invalidateKeys: [['occupancies', unitId], ['unit-detail', unitId]],
      onSuccess: () => {
        toastSuccess('Oturma sonlandırıldı.')
        setEndingId(null)
      },
    },
  )

  const createResidentMutation = useApiMutation<ResidentSearchRow, CreateResidentDto>('/residents', {
    onSuccess: (newResident) => {
      toastSuccess(`${newResident.firstName} ${newResident.lastName} kaydedildi.`)
      setSelectedResident(newResident)
      occupancyForm.setValue('residentId', newResident.id)
      setShowNewResidentForm(false)
      newResidentForm.reset()
    },
  })

  // Sync selected resident to occupancy form
  useEffect(() => {
    if (selectedResident) {
      occupancyForm.setValue('residentId', selectedResident.id)
    }
  }, [selectedResident, occupancyForm])

  return (
    <div className="ledger-panel overflow-hidden">
      <SectionTitle
        title="Sakin Bilgisi"
        subtitle="Aktif oturma, geçmiş ilişki ve yeni atama akışı."
        actions={(
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Sakin Ata
          </Button>
        )}
      />

      <div className="p-5 space-y-3">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        )}

        {/* Active occupancies */}
        {!isLoading && active.length === 0 && (
          <EmptyState
            icon={Users}
            title="Aktif sakin ataması yok"
            description="Ev sahibini veya kiracıyı bu daireye atayarak operasyonu netleştirin."
            actionLabel="Sakin Ata"
            onAction={() => setSheetOpen(true)}
          />
        )}

        {!isLoading && active.map((occ) => (
          <div key={occ.id} className="rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(243,248,255,0.82))] p-4 shadow-[0_14px_30px_rgba(8,17,31,0.04)] space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    href={`/residents/${occ.resident.id}`}
                    className="text-sm font-semibold text-[#0c1427] hover:text-[#1a56db] hover:underline underline-offset-2 transition-colors"
                  >
                    {occ.resident.firstName} {occ.resident.lastName}
                  </Link>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${ROLE_COLORS[occ.role] ?? 'bg-gray-100 text-gray-700'}`}>
                    {ROLE_LABELS[occ.role] ?? occ.role}
                  </span>
                  {occ.isPrimaryResponsible && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-yellow-100 text-yellow-700">
                      <Star className="h-2.5 w-2.5" aria-hidden="true" />
                      Birincil
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6b7280] mt-0.5">{occ.resident.phoneNumber}</p>
                {occ.resident.email && (
                  <p className="text-[11px] text-[#9ca3af]">{occ.resident.email}</p>
                )}
                <p className="text-[11px] text-[#9ca3af] mt-0.5">
                  Başlangıç: {formatShortDate(occ.startDate)}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1.5">
                <Link
                  href={`/residents/${occ.resident.id}`}
                  className="inline-flex items-center gap-1 text-[11px] text-[#9ca3af] hover:text-[#1a56db] transition-colors px-2 py-1 rounded hover:bg-[#eff6ff]"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  Profil
                </Link>
                {endingId === occ.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => endOccupancyMutation.mutate({ id: occ.id })}
                      disabled={endOccupancyMutation.isPending}
                      className="text-[11px] font-bold text-[#ba1a1a] hover:text-[#93000a] transition-colors disabled:opacity-50"
                    >
                      Evet
                    </button>
                    <span className="text-[#d1d5db]">·</span>
                    <button
                      type="button"
                      onClick={() => setEndingId(null)}
                      className="text-[11px] text-[#6b7280] hover:text-[#0c1427] transition-colors"
                    >
                      Hayır
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEndingId(occ.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-[#9ca3af] hover:text-[#ba1a1a] transition-colors px-2 py-1 rounded hover:bg-[#fee2e2]"
                    aria-label={`${occ.resident.firstName} ${occ.resident.lastName} oturmasını sonlandır`}
                  >
                    <LogOut className="h-3 w-3" aria-hidden="true" />
                    Çıkış Kaydet
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Past occupancies — collapsible */}
        {!isLoading && past.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowPastOccupancies(!showPastOccupancies)}
              className="text-xs text-[#9ca3af] hover:text-[#6b7280] transition-colors"
            >
              {showPastOccupancies ? '▲' : '▼'} Geçmiş oturmalar ({past.length})
            </button>
            {showPastOccupancies && (
              <div className="mt-2 space-y-1.5">
                {past.map((occ) => (
                  <div key={occ.id} className="flex items-center justify-between gap-2 rounded-[18px] border border-white/80 bg-white/80 px-3 py-2.5 shadow-[0_12px_26px_rgba(8,17,31,0.03)]">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={`/residents/${occ.resident.id}`}
                          className="text-xs font-semibold text-[#374151] hover:text-[#1a56db] hover:underline underline-offset-2 transition-colors"
                        >
                          {occ.resident.firstName} {occ.resident.lastName}
                        </Link>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${ROLE_COLORS[occ.role] ?? 'bg-gray-100 text-gray-700'}`}>
                          {ROLE_LABELS[occ.role] ?? occ.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9ca3af] mt-0.5">
                        {formatShortDate(occ.startDate)} → {occ.endDate ? formatShortDate(occ.endDate) : '…'}
                      </p>
                      {occ.resident.phoneNumber && (
                        <p className="text-[11px] text-[#9ca3af]">{occ.resident.phoneNumber}</p>
                      )}
                    </div>
                    <Link
                      href={`/residents/${occ.resident.id}`}
                      className="shrink-0 inline-flex items-center gap-1 text-[11px] text-[#9ca3af] hover:text-[#1a56db] transition-colors px-2 py-1 rounded hover:bg-[#eff6ff]"
                      title="Sakin profilini görüntüle"
                    >
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      Profil
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Sakin Ata Sheet ───────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Sakin Ata</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Step 1: Resident select */}
            <div className="space-y-3">
              <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">
                1. Sakin Seç
              </p>

              {selectedResident ? (
                <div className="flex items-center justify-between rounded-[20px] border border-white/85 bg-white/82 px-4 py-2 shadow-[0_14px_30px_rgba(8,17,31,0.04)]">
                  <div>
                    <p className="text-sm font-semibold text-[#0c1427]">
                      {selectedResident.firstName} {selectedResident.lastName}
                    </p>
                    <p className="text-xs text-[#6b7280]">{selectedResident.phoneNumber}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedResident(null)
                      occupancyForm.setValue('residentId', '')
                    }}
                    className="text-xs text-[#9ca3af] hover:text-[#ba1a1a]"
                  >
                    Değiştir
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9ca3af]" aria-hidden="true" />
                    <input
                      type="search"
                      value={residentSearch}
                      onChange={(e) => setResidentSearch(e.target.value)}
                      placeholder="İsim veya telefon ara…"
                      className="ledger-input w-full pl-8"
                    />
                  </div>

                  {residentSearch.length >= 2 && searchResults.length > 0 && (
                    <div className="rounded-[18px] border border-white/85 bg-white/82 overflow-hidden shadow-[0_12px_26px_rgba(8,17,31,0.04)]">
                      {searchResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setSelectedResident(r)
                            setResidentSearch('')
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-[#f5f8ff] border-b border-white/80 last:border-b-0 transition-colors"
                        >
                          <p className="text-sm font-medium text-[#0c1427]">{r.firstName} {r.lastName}</p>
                          <p className="text-xs text-[#9ca3af]">{r.phoneNumber}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {residentSearch.length >= 2 && searchResults.length === 0 && (
                    <p className="text-xs text-[#9ca3af] px-1">Sonuç bulunamadı.</p>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowNewResidentForm(!showNewResidentForm)}
                    className="text-xs text-[#445266] hover:text-[#0c1427] underline underline-offset-2"
                  >
                    {showNewResidentForm ? '— İptal' : '+ Yeni sakin ekle'}
                  </button>

                  {showNewResidentForm && (
                    <div className="rounded-[22px] border border-white/80 bg-white/82 p-4 space-y-3 shadow-[0_14px_30px_rgba(8,17,31,0.04)]">
                      <Form {...newResidentForm}>
                        <form onSubmit={newResidentForm.handleSubmit((data) => createResidentMutation.mutate(data))} className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <FormField
                              control={newResidentForm.control}
                              name="firstName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ad</FormLabel>
                                  <FormControl><Input placeholder="Ahmet" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={newResidentForm.control}
                              name="lastName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Soyad</FormLabel>
                                  <FormControl><Input placeholder="Yılmaz" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={newResidentForm.control}
                            name="phoneNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefon</FormLabel>
                                <FormControl><Input placeholder="05001234567" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={newResidentForm.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tip</FormLabel>
                                <FormControl>
                                  <select {...field} className="ledger-input bg-white w-full h-10">
                                    <option value={ResidentType.OWNER}>Ev Sahibi</option>
                                    <option value={ResidentType.TENANT}>Kiracı</option>
                                    <option value={ResidentType.CONTACT}>İletişim Kişisi</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" size="sm" disabled={createResidentMutation.isPending}>
                            {createResidentMutation.isPending ? 'Kaydediliyor…' : 'Sakin Oluştur'}
                          </Button>
                        </form>
                      </Form>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Occupancy details */}
            <div className="space-y-3">
              <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">
                2. Oturma Detayları
              </p>
              <Form {...occupancyForm}>
                <form
                  onSubmit={occupancyForm.handleSubmit((data) => createOccupancyMutation.mutate(data))}
                  className="space-y-3"
                >
                  <FormField
                    control={occupancyForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol</FormLabel>
                        <FormControl>
                          <select {...field} className="ledger-input bg-white w-full h-10">
                            <option value={OccupancyRole.OWNER}>Ev Sahibi</option>
                            <option value={OccupancyRole.TENANT}>Kiracı</option>
                            <option value={OccupancyRole.RESPONSIBLE}>Sorumlu</option>
                            <option value={OccupancyRole.CONTACT}>İletişim Kişisi</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={occupancyForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlangıç Tarihi</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value instanceof Date
                              ? field.value.toISOString().slice(0, 10)
                              : String(field.value ?? '').slice(0, 10)}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={occupancyForm.control}
                    name="isPrimaryResponsible"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            id="isPrimary"
                            className="rounded"
                          />
                        </FormControl>
                        <FormLabel htmlFor="isPrimary" className="!mt-0 text-sm font-normal cursor-pointer">
                          Birincil sorumlu olarak işaretle
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={occupancyForm.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Not (opsiyonel)</FormLabel>
                        <FormControl>
                          <textarea
                            {...field}
                            rows={2}
                            placeholder="Sözleşme no, ek bilgi…"
                            className="ledger-input w-full resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createOccupancyMutation.isPending || !selectedResident}
                  >
                    {createOccupancyMutation.isPending ? 'Kaydediliyor…' : 'Sakin Ata'}
                  </Button>
                  {!selectedResident && (
                    <p className="text-xs text-[#9ca3af] text-center">Önce bir sakin seçin.</p>
                  )}
                </form>
              </Form>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UnitDetailPage() {
  const params = useParams<{ id: string }>()
  const unitId = params?.id
  const queryClient = useQueryClient()
  const [openPaymentModal, setOpenPaymentModal] = useState(false)

  const { data: unit, isLoading } = useApiQuery<UnitDetail>(
    ['unit-detail', unitId],
    `/units/${unitId}`,
    undefined,
    { enabled: !!unitId },
  )

  const { data: auditLog } = useApiQuery<AuditLogEntry[]>(
    ['unit-audit-log', unitId],
    '/ledger/unit-audit-log',
    { unitId, limit: 10 },
    { enabled: !!unitId },
  )
  const auditEntries = auditLog ?? []

  const totals = useMemo(() => {
    const duesRows = unit?.dues ?? []
    const totalAmount = duesRows.reduce((sum, dues) => sum + toNumber(dues.amount), 0)
    const totalPaid = duesRows.reduce((sum, dues) => sum + toNumber(dues.paidAmount), 0)
    const totalDebt = Math.max(0, totalAmount - totalPaid)
    return { totalAmount, totalPaid, totalDebt }
  }, [unit])

  const ledger = useMemo(() => {
    if (!unit) return [] as Array<LedgerRow & { balance: number }>

    const rows: LedgerRow[] = []
    for (const dues of unit.dues) {
      rows.push({
        id: `charge-${dues.id}`,
        date: dues.dueDate ? new Date(dues.dueDate) : null,
        type: 'CHARGE',
        title: `${dues.periodMonth}/${dues.periodYear} Aidatı`,
        subtitle: 'Dönemsel tahakkuk',
        charge: toNumber(dues.amount),
        payment: 0,
        status: dues.status,
      })
      for (const payment of dues.payments ?? []) {
        rows.push({
          id: `payment-${payment.id}`,
          date: payment.paidAt ? new Date(payment.paidAt) : null,
          type: 'PAYMENT',
          title: paymentMethodLabel(payment.method),
          subtitle: payment.note ?? 'Tahsilat kaydı',
          charge: 0,
          payment: toNumber(payment.amount),
          status: 'CONFIRMED',
        })
      }
    }

    rows.sort((a, b) => {
      const av = a.date?.getTime() ?? 0
      const bv = b.date?.getTime() ?? 0
      return av - bv
    })

    let balance = 0
    const withBalance = rows.map((row) => {
      balance += row.charge
      balance -= row.payment
      return { ...row, balance }
    })

    return withBalance.reverse()
  }, [unit])

  const preferredDuesId = useMemo(() => {
    if (!unit?.dues.length) return undefined
    const unpaid = unit.dues.find((dues) => Math.max(0, toNumber(dues.amount) - toNumber(dues.paidAmount)) > 0)
    return (unpaid ?? unit.dues[0])?.id
  }, [unit])

  const preferredDuesRemaining = useMemo(() => {
    if (!unit?.dues.length || !preferredDuesId) return undefined
    const dues = unit.dues.find((item) => item.id === preferredDuesId)
    if (!dues) return undefined
    return Math.max(0, toNumber(dues.amount) - toNumber(dues.paidAmount))
  }, [preferredDuesId, unit])

  const recentPayments = useMemo(() => {
    if (!unit?.dues.length) return []
    return unit.dues
      .flatMap((dues) => dues.payments ?? [])
      .sort((a, b) => new Date(b.paidAt ?? 0).getTime() - new Date(a.paidAt ?? 0).getTime())
      .slice(0, 4)
      .map((payment) => ({
        id: payment.id,
        amount: toNumber(payment.amount),
        method: payment.method,
        paidAt: payment.paidAt,
        note: payment.note ?? undefined,
      }))
  }, [unit])

  return (
    <div className="space-y-6 motion-in">
      <Breadcrumb items={[{ label: 'Daireler', href: '/units' }, { label: `Daire ${unit?.number ?? ''}` }]} />

      <PageHeader
        title={`${unit?.site.name ?? 'Daire'} · Daire ${unit?.number ?? ''}`}
        eyebrow="Birim Operasyonu"
        subtitle="Sakin profili, oturma geçmişi, bakiye özeti ve finansal hareket kaydı."
        actions={(
          <Button type="button" size="sm" onClick={() => setOpenPaymentModal(true)}>
            Ödeme Al
          </Button>
        )}
      />

      {isLoading && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ledger-panel p-5 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      )}

      {unit && (
        <>
          <div className="motion-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Toplam Tahakkuk"
              value={formatTry(totals.totalAmount)}
              hint="Daire için oluşmuş toplam aidat ve borç kalemi."
              icon={Building2}
              tone="blue"
            />
            <KpiCard
              label="Tahsil Edilen"
              value={formatTry(totals.totalPaid)}
              hint="Onaylı ödemelerle kapanan toplam tutar."
              icon={Wallet}
              tone="emerald"
            />
            <KpiCard
              label="Güncel Bakiye"
              value={formatTry(totals.totalDebt)}
              hint="Ödeme bekleyen veya kısmi ödenmiş açık bakiye."
              icon={CreditCard}
              tone="rose"
            />
            <KpiCard
              label="Aktif Sakin"
              value={unit.residents.length}
              hint="Daireye bağlı mevcut aktif sakin sayısı."
              icon={Users}
              tone="navy"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            {/* Oturma Yönetimi — replaces old static resident panel */}
            {unitId && <OccupancyPanel unitId={unitId} />}

            <div className="ledger-panel overflow-hidden">
              <SectionTitle title="Mülk Detayı" subtitle="Tip, kat, blok ve fiziki alan özeti." />
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[20px] bg-white/82 p-3 shadow-[0_14px_30px_rgba(8,17,31,0.04)]">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[#6b7280]">Tip</p>
                    <p className="mt-1 text-sm font-semibold text-[#0c1427]">{unit.type}</p>
                  </div>
                  <div className="rounded-[20px] bg-white/82 p-3 shadow-[0_14px_30px_rgba(8,17,31,0.04)]">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[#6b7280]">Kat</p>
                    <p className="mt-1 text-sm font-semibold text-[#0c1427]">{unit.floor ?? '-'}</p>
                  </div>
                  <div className="rounded-[20px] bg-white/82 p-3 shadow-[0_14px_30px_rgba(8,17,31,0.04)]">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[#6b7280]">Blok</p>
                    <p className="mt-1 text-sm font-semibold text-[#0c1427]">{unit.block?.name ?? 'Bloksuz'}</p>
                  </div>
                  <div className="rounded-[20px] bg-white/82 p-3 shadow-[0_14px_30px_rgba(8,17,31,0.04)]">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[#6b7280]">Alan</p>
                    <p className="mt-1 text-sm font-semibold text-[#0c1427]">{unit.area ? `${unit.area} m²` : '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="ledger-panel overflow-hidden">
              <SectionTitle title="Ödeme Performansı" subtitle="Toplam tahakkuk üzerinden tahsilat seviyesi." />
              <div className="p-5">
                <p className="text-2xl font-black text-[#0c1427] tabular-nums">
                  %{totals.totalAmount > 0 ? Math.round((totals.totalPaid / totals.totalAmount) * 100) : 0}
                </p>
                <p className="mt-1 text-xs text-[#6b7280]">Açık bakiye düştükçe bu oran yükselir.</p>
                <div className="ledger-kpi-rail">
                  <span className="bg-[#006e2d]" style={{ width: `${totals.totalAmount > 0 ? Math.round((totals.totalPaid / totals.totalAmount) * 100) : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Balance Banner */}
          <div className="relative overflow-hidden ledger-gradient rounded-2xl p-8 text-white flex flex-col md:flex-row justify-between gap-4 items-center">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-75">Güncel Toplam Bakiye</p>
              <p className="text-5xl md:text-6xl font-black tabular-nums mt-2">{formatTry(totals.totalDebt)}</p>
              <p className="text-sm mt-2 opacity-90">Ödeme yapılmamış veya kısmi ödenmiş kalemler dahil.</p>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setOpenPaymentModal(true)}
                className="px-6 py-3 rounded-lg bg-white text-[#0c1427] text-xs font-bold text-center"
              >
                Şimdi Ödeme Al
              </button>
              <button type="button" className="px-6 py-3 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-bold">
                Ekstre Gönder
              </button>
            </div>
          </div>

          {/* Ledger */}
          <div className="ledger-panel overflow-hidden">
            <SectionTitle
              title="Cari Hareket Kayıtları"
              subtitle="Tahakkuk ve ödeme hareketlerinin zaman akışında bakiyesi."
              actions={(
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm">Filtre</Button>
                  <Button type="button" variant="outline" size="sm">Dışa Aktar</Button>
                </div>
              )}
            />

            <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
              <span className="col-span-2">İşlem Tarihi</span>
              <span className="col-span-3">Tür / Açıklama</span>
              <span className="col-span-2 text-right">Borç (+)</span>
              <span className="col-span-2 text-right">Ödeme (-)</span>
              <span className="col-span-2 text-right">Bakiye</span>
              <span className="col-span-1 text-center">Durum</span>
            </div>

            <div className="ledger-divider">
              {ledger.map((row) => (
                <div key={row.id} className="grid grid-cols-12 px-5 py-3 items-center ledger-table-row-hover">
                  <p className="col-span-2 text-xs text-[#5f6a75]">{formatDateTime(row.date)}</p>
                  <div className="col-span-3">
                    <p className="text-sm font-semibold text-[#0c1427]">{row.title}</p>
                    <p className="text-[11px] text-[#6b7280]">{row.subtitle}</p>
                  </div>
                  <p className="col-span-2 text-right text-sm tabular-nums font-bold text-[#ba1a1a]">
                    {row.charge > 0 ? formatTry(row.charge) : '—'}
                  </p>
                  <p className="col-span-2 text-right text-sm tabular-nums font-bold text-[#006e2d]">
                    {row.payment > 0 ? formatTry(row.payment) : '—'}
                  </p>
                  <p className="col-span-2 text-right text-sm tabular-nums font-bold text-[#0c1427]">{formatTry(row.balance)}</p>
                  <div className="col-span-1 flex justify-center">
                    <StatusPill
                      label={row.type === 'PAYMENT' ? 'Onaylandı' : duesStatusLabel(row.status)}
                      tone={row.type === 'PAYMENT' ? 'success' : duesStatusTone(row.status)}
                    />
                  </div>
                </div>
              ))}
              {ledger.length === 0 && <p className="px-5 py-6 text-sm text-[#6b7280]">Hareket kaydı bulunmuyor.</p>}
            </div>
          </div>

          {/* Audit Log */}
          {auditEntries.length > 0 && (
            <div className="ledger-panel overflow-hidden">
              <SectionTitle title="İşlem Denetim Kaydı" subtitle="Bu daire için alınan kritik aksiyonların kısa geçmişi." />
              <div className="ledger-divider">
                {auditEntries.map((entry) => (
                  <div key={entry.id} className="px-5 py-3 flex items-start justify-between gap-4 ledger-table-row-hover">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0c1427]">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </p>
                      <p className="text-xs text-[#6b7280] mt-0.5">{entry.performedBy}</p>
                    </div>
                    <p className="text-xs text-[#6b7280] shrink-0">{formatDateTime(entry.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-[#6b7280]">
            Son güncelleme: {formatShortDate(new Date())}
          </div>
        </>
      )}

      <PaymentCollectModal
        open={openPaymentModal}
        onClose={() => setOpenPaymentModal(false)}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ['unit-detail', unitId] })
          await queryClient.invalidateQueries({ queryKey: ['unit-audit-log', unitId] })
        }}
        initialDuesId={preferredDuesId}
        presetAmount={preferredDuesRemaining}
        context={
          unit
            ? {
                siteName: unit.site.name,
                unitNumber: unit.number,
                residentName: unit.residents[0] ? `${unit.residents[0].firstName} ${unit.residents[0].lastName}` : undefined,
                totalDebt: totals.totalDebt,
                recentPayments,
              }
            : undefined
        }
      />
    </div>
  )
}
