'use client'

import { use } from 'react'
import Link from 'next/link'
import {
  User, Phone, Mail, MapPin, Smartphone, SmartphoneNfc,
  CreditCard, Building2, ShieldCheck, ShieldOff, AlertTriangle,
} from 'lucide-react'
import { useApiQuery } from '@/hooks/use-api'
import { Breadcrumb } from '@/components/breadcrumb'
import { KpiCard, PageHeader, SectionTitle, StatusPill } from '@/components/surface'
import { Skeleton } from '@/components/ui/skeleton'
import { ViewStatePanel } from '@/components/view-state-panel'
import {
  duesStatusLabel,
  duesStatusTone,
  formatShortDate,
  formatTry,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
} from '@/lib/formatters'
import { getRouteFallbackMessage, hasRouteAccess } from '@/lib/access-policy'
import { useAuth } from '@/providers/auth-provider'
import { DuesStatus, PaymentMethod, PaymentStatus, ResidentType } from '@sakin/shared'
import { UI_COPY } from '@/lib/ui-copy'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ResidentDetail {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phoneNumber: string
  tckn: string | null
  type: ResidentType
  isActive: boolean
  createdAt: string
  user: {
    id: string
    email: string | null
    displayName: string | null
    createdAt: string
  } | null
  occupancies: Array<{
    id: string
    startDate: string
    endDate: string | null
    isActive: boolean
    unit: {
      id: string
      number: string
      floor: number | null
      block: { name: string } | null
      site: { name: string }
    }
  }>
  payments: Array<{
    id: string
    amount: string | number
    currency: string
    method: PaymentMethod
    status: PaymentStatus
    paidAt: string | null
    receiptNumber: string | null
    createdAt: string
  }>
}

interface DuesRow {
  id: string
  amount: string | number
  paidAmount: string | number
  remainingAmount: string | number
  status: DuesStatus
  dueDate: string
  periodMonth: number
  periodYear: number
  description?: string | null
}

interface DuesListResponse {
  data: DuesRow[]
}

const TYPE_LABELS: Record<ResidentType, string> = {
  [ResidentType.OWNER]: 'Ev Sahibi',
  [ResidentType.TENANT]: 'Kiracı',
  [ResidentType.CONTACT]: 'İletişim Kişisi',
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ResidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { role, loading: authLoading } = useAuth()
  const canAccessResidents = hasRouteAccess('/residents', role)

  const { data: resident, isLoading, error } = useApiQuery<ResidentDetail>(
    ['resident-detail', id],
    `/residents/${id}`,
    undefined,
    { enabled: !authLoading && canAccessResidents },
  )

  const activeUnitId = resident?.occupancies.find((occ) => occ.isActive)?.unit.id ?? resident?.occupancies[0]?.unit.id

  const { data: duesData, isLoading: duesLoading, error: duesError } = useApiQuery<DuesListResponse>(
    ['resident-open-dues', id, activeUnitId],
    '/dues',
    { unitId: activeUnitId, page: 1, limit: 20 },
    { enabled: Boolean(activeUnitId) },
  )

  if (isLoading) return <ResidentSkeleton />

  if (!authLoading && !canAccessResidents) {
    return (
      <div className="space-y-6 motion-in">
        <Breadcrumb items={[{ label: 'Sakinler' }, { label: 'Yetki Gerekli' }]} />
        <PageHeader
          title={UI_COPY.residents.detailTitle}
          eyebrow={UI_COPY.residents.eyebrow}
          subtitle={UI_COPY.residents.detailUnauthorizedSubtitle}
        />
        <ViewStatePanel
          state="unauthorized"
          title={UI_COPY.residents.detailUnauthorizedTitle}
          description={getRouteFallbackMessage('/residents') ?? UI_COPY.residents.detailUnauthorizedDescription}
          actionLabel={UI_COPY.common.residentsListAction}
          actionHref="/residents"
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 motion-in">
        <Breadcrumb items={[{ label: 'Sakinler', href: '/residents' }, { label: 'Yükleme Hatası' }]} />
        <PageHeader
          title={UI_COPY.residents.detailTitle}
          eyebrow={UI_COPY.residents.eyebrow}
          subtitle={UI_COPY.residents.detailLoadErrorSubtitle}
        />
        <ViewStatePanel
          state="error"
          title={UI_COPY.residents.detailLoadErrorTitle}
          description={error.message}
          actionLabel={UI_COPY.common.residentsListAction}
          actionHref="/residents"
        />
      </div>
    )
  }

  if (!resident) {
    return (
      <div className="space-y-6 motion-in">
        <Breadcrumb items={[{ label: 'Sakinler', href: '/residents' }, { label: 'Sakin Bulunamadı' }]} />
        <PageHeader
          title={UI_COPY.residents.detailTitle}
          eyebrow={UI_COPY.residents.eyebrow}
          subtitle={UI_COPY.residents.detailMissingSubtitle}
        />
        <ViewStatePanel
          state="empty"
          title={UI_COPY.residents.detailMissingTitle}
          description={UI_COPY.residents.detailMissingDescription}
          actionLabel={UI_COPY.common.residentsListAction}
          actionHref="/residents"
        />
      </div>
    )
  }

  const activeOccupancy = resident.occupancies.find((o) => o.isActive) ?? resident.occupancies[0]
  const hasMobileApp = resident.user !== null
  const totalPaid = resident.payments
    .filter((p) => p.status === PaymentStatus.CONFIRMED)
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const openDues = (duesData?.data ?? []).filter((dues) =>
    dues.status === DuesStatus.PENDING
    || dues.status === DuesStatus.PARTIALLY_PAID
    || dues.status === DuesStatus.OVERDUE,
  )
  const openDebtAmount = openDues.reduce((sum, dues) => sum + Math.max(0, Number(dues.remainingAmount)), 0)
  const openDebtValue = duesLoading ? '...' : duesError ? '—' : formatTry(openDebtAmount)
  const openDebtHint = duesError
    ? 'Açık borç verisi şu an alınamadı.'
    : duesLoading
      ? 'Açık borç verisi yükleniyor.'
      : `${openDues.length} açık aidat kaydı.`

  return (
    <div className="space-y-6 motion-in">
      <Breadcrumb
        items={[
          { label: 'Sakinler', href: '/residents' },
          { label: `${resident.firstName} ${resident.lastName}` },
        ]}
      />

      <PageHeader
        title={`${resident.firstName} ${resident.lastName}`}
        eyebrow={UI_COPY.residents.detailTitle}
        subtitle={
          activeOccupancy
            ? `${activeOccupancy.unit.site.name} · Daire ${activeOccupancy.unit.number}${activeOccupancy.unit.floor != null ? ` · Kat ${activeOccupancy.unit.floor}` : ''}`
            : UI_COPY.residents.detailSubtitle
        }
      />

      <div className="ledger-panel p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="h-14 w-14 rounded-full bg-[#e6e8ea] grid place-items-center shrink-0">
            <User className="h-7 w-7 text-[#445266]" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-[#0c1427]">
                {resident.firstName} {resident.lastName}
              </h1>
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e6e8ea] text-[#445266]">
                {TYPE_LABELS[resident.type]}
              </span>
              <StatusPill
                label={resident.isActive ? 'Aktif' : 'Pasif'}
                tone={resident.isActive ? 'success' : 'neutral'}
              />
            </div>

            {activeOccupancy && (
              <p className="mt-1 text-sm text-[#6b7280] flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                {activeOccupancy.unit.site.name} · Daire {activeOccupancy.unit.number}
                {activeOccupancy.unit.floor != null && ` · Kat ${activeOccupancy.unit.floor}`}
                {activeOccupancy.unit.block && ` · ${activeOccupancy.unit.block.name}`}
              </p>
            )}

            <p className="mt-1 text-xs text-[#9ca3af]">
              Kayıt: {formatShortDate(resident.createdAt)}
            </p>
          </div>

          {/* Mobil App Durumu */}
          <div className={`shrink-0 flex items-center gap-2 rounded-lg px-3 py-2 border ${
            hasMobileApp
              ? 'bg-green-50 border-green-200'
              : 'bg-[#f9fafb] border-[#e5e7eb]'
          }`}>
            {hasMobileApp ? (
              <>
                <SmartphoneNfc className="h-4 w-4 text-green-600" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-green-800">Mobil Uygulama</p>
                  <p className="text-[11px] text-green-700">Hesap bağlı</p>
                </div>
              </>
            ) : (
              <>
                <Smartphone className="h-4 w-4 text-[#9ca3af]" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-[#6b7280]">Mobil Uygulama</p>
                  <p className="text-[11px] text-[#9ca3af]">Henüz bağlanmadı</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="motion-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ödeme Toplamı"
          value={formatTry(totalPaid)}
          hint="Onaylı tahsilatlardan oluşan toplam."
          icon={CreditCard}
          tone="emerald"
        />
        <KpiCard
          label="Açık Borç"
          value={openDebtValue}
          hint={openDebtHint}
          icon={AlertTriangle}
          tone={openDues.length > 0 ? 'rose' : 'blue'}
        />
        <KpiCard
          label="Açık Aidat"
          value={duesLoading ? '...' : openDues.length}
          hint="Tahsilat bekleyen aidat satır sayısı."
          icon={Building2}
          tone={openDues.length > 0 ? 'amber' : 'navy'}
        />
        <KpiCard
          label="Dijital Erişim"
          value={hasMobileApp ? 'Mobil Aktif' : 'Henüz Yok'}
          hint="Sakin uygulama hesabı ilişkisi."
          icon={hasMobileApp ? SmartphoneNfc : Smartphone}
          tone={hasMobileApp ? 'cyan' : 'rose'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* İletişim Bilgileri */}
        <div className="ledger-panel p-5 space-y-4">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">İletişim</p>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-[#9ca3af] mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs text-[#6b7280]">Telefon</p>
                <p className="text-sm font-medium text-[#0c1427]">{resident.phoneNumber}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-[#9ca3af] mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs text-[#6b7280]">E-posta</p>
                <p className="text-sm font-medium text-[#0c1427]">{resident.email ?? '—'}</p>
              </div>
            </div>

            {resident.tckn && (
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-[#9ca3af] mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs text-[#6b7280]">TC Kimlik No</p>
                  <p className="text-sm font-medium text-[#0c1427] font-mono">
                    {'•'.repeat(7)}{resident.tckn.slice(-4)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Oturma Bilgisi */}
        <div className="ledger-panel p-5 space-y-4">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Oturma Geçmişi</p>

          {resident.occupancies.length === 0 ? (
            <p className="text-sm text-[#9ca3af]">Daire kaydı bulunamadı.</p>
          ) : (
            <div className="space-y-3">
              {resident.occupancies.map((occ) => (
                <div key={occ.id} className={`rounded-lg p-3 ${occ.isActive ? 'bg-green-50 border border-green-200' : 'bg-[#f9fafb] border border-[#e5e7eb]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#6b7280]" aria-hidden="true" />
                      <Link
                        href={`/units/${occ.unit.id}`}
                        className="text-sm font-semibold text-[#0c1427] hover:underline"
                      >
                        {occ.unit.site.name} / Daire {occ.unit.number}
                      </Link>
                    </div>
                    {occ.isActive && (
                      <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Aktif</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    {formatShortDate(occ.startDate)}
                    {occ.endDate ? ` — ${formatShortDate(occ.endDate)}` : ' — devam ediyor'}
                  </p>
                  {occ.unit.floor != null && (
                    <p className="text-xs text-[#9ca3af]">
                      Kat {occ.unit.floor}{occ.unit.block ? ` · ${occ.unit.block.name}` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hesap / Mobil Uygulama */}
        <div className="ledger-panel p-5 space-y-4">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Dijital Hesap</p>

          {hasMobileApp && resident.user ? (
            <div className="space-y-3">
              <div className={`rounded-lg p-3 bg-green-50 border border-green-200 flex items-center gap-3`}>
                <div className="h-8 w-8 rounded-full bg-green-100 grid place-items-center">
                  <ShieldCheck className="h-4 w-4 text-green-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Mobil uygulama aktif</p>
                  <p className="text-xs text-green-700">Sakin kendi borcunu görüp ödeme yapabilir</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-[#6b7280]">Hesap e-postası</p>
                  <p className="text-sm text-[#374151]">{resident.user.email ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6b7280]">Hesap açılış</p>
                  <p className="text-sm text-[#374151]">{formatShortDate(resident.user.createdAt)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg p-3 bg-[#f9fafb] border border-[#e5e7eb] flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[#e6e8ea] grid place-items-center">
                  <ShieldOff className="h-4 w-4 text-[#9ca3af]" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#374151]">Mobil hesap yok</p>
                  <p className="text-xs text-[#6b7280]">Sakin henüz uygulamaya giriş yapmadı</p>
                </div>
              </div>
              <p className="text-xs text-[#9ca3af]">
                Sakin mobil uygulamayı indirip kaydolduğunda bu ekranda hesap bilgileri görünür.
                Ödeme ve borç bildirimlerinden yararlanmak için giriş yapması gerekir.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="ledger-panel overflow-hidden">
        <SectionTitle
          title="Açık Borç Özeti"
          subtitle="Aktif daire için tahsilat bekleyen aidatlar."
          actions={(
            <Link href="/finance?status=OVERDUE" className="text-xs font-semibold text-[#1f3b5c] hover:underline">
              Tahsilat Ekranına Git
            </Link>
          )}
        />
        {duesLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-12 rounded-md" />
            ))}
          </div>
        ) : duesError ? (
          <div className="px-5 pb-5">
            <p className="text-sm text-[#6b7280]">Açık borç listesi şu an alınamadı. Tahsilat ekranından tekrar deneyin.</p>
          </div>
        ) : openDues.length === 0 ? (
          <div className="px-5 pb-5">
            <p className="text-sm text-[#6b7280]">Bu sakin için açık aidat kaydı görünmüyor.</p>
          </div>
        ) : (
          <>
            <div className="hidden xl:block overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
                  <span className="col-span-3">Dönem</span>
                  <span className="col-span-3">Vade</span>
                  <span className="col-span-2 text-right">Tutar</span>
                  <span className="col-span-2 text-right">Kalan</span>
                  <span className="col-span-2">Durum</span>
                </div>
                <div className="ledger-divider">
                  {openDues.slice(0, 6).map((dues) => (
                    <div key={dues.id} className="grid grid-cols-12 items-center px-5 py-3 text-sm ledger-table-row-hover">
                      <p className="col-span-3 text-[#0c1427] tabular-nums">{dues.periodMonth}/{dues.periodYear}</p>
                      <p className="col-span-3 text-[#6b7280]">{formatShortDate(dues.dueDate)}</p>
                      <p className="col-span-2 text-right tabular-nums">{formatTry(Number(dues.amount))}</p>
                      <p className="col-span-2 text-right tabular-nums font-semibold text-[#0c1427]">{formatTry(Number(dues.remainingAmount))}</p>
                      <span className="col-span-2">
                        <StatusPill label={duesStatusLabel(dues.status)} tone={duesStatusTone(dues.status)} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3 p-4 xl:hidden">
              {openDues.slice(0, 6).map((dues) => (
                <div key={dues.id} className="rounded-[18px] border border-white/80 bg-white/80 p-4 shadow-[0_12px_26px_rgba(8,17,31,0.05)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0c1427] tabular-nums">{dues.periodMonth}/{dues.periodYear}</p>
                      <p className="mt-1 text-xs text-[#6b7280]">Vade: {formatShortDate(dues.dueDate)}</p>
                    </div>
                    <StatusPill label={duesStatusLabel(dues.status)} tone={duesStatusTone(dues.status)} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
                      <p className="text-[#6b7280]">Toplam</p>
                      <p className="mt-0.5 font-semibold tabular-nums text-[#0c1427]">{formatTry(Number(dues.amount))}</p>
                    </div>
                    <div className="rounded-xl bg-[#fff6ea] px-3 py-2">
                      <p className="text-[#7a613f]">Kalan</p>
                      <p className="mt-0.5 font-semibold tabular-nums text-[#8a4b00]">{formatTry(Number(dues.remainingAmount))}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Finansal Özet + Ödeme Geçmişi */}
      <div className="ledger-panel overflow-x-auto">
        <SectionTitle
          title="Ödeme Geçmişi"
          subtitle={`Son 10 ödeme hareketi. Onaylanan toplam: ${formatTry(totalPaid)}`}
          actions={<CreditCard className="h-5 w-5 text-[#9ca3af]" aria-hidden="true" />}
        />

        {resident.payments.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-[#9ca3af]">Henüz ödeme kaydı yok.</p>
          </div>
        ) : (
          <>
            <div className="hidden xl:block overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
                  <span className="col-span-3">Tarih</span>
                  <span className="col-span-2 text-right">Tutar</span>
                  <span className="col-span-3">Yöntem</span>
                  <span className="col-span-2">Durum</span>
                  <span className="col-span-2">Makbuz</span>
                </div>
                <div className="ledger-divider">
                  {resident.payments.map((payment) => (
                    <div key={payment.id} className="grid grid-cols-12 px-5 py-3 items-center text-sm ledger-table-row-hover">
                      <p className="col-span-3 text-[#6b7280] tabular-nums">
                        {formatShortDate(payment.paidAt ?? payment.createdAt)}
                      </p>
                      <p className="col-span-2 text-right font-semibold tabular-nums text-[#0c1427]">
                        {formatTry(Number(payment.amount))}
                      </p>
                      <p className="col-span-3 text-[#374151]">{paymentMethodLabel(payment.method)}</p>
                      <span className="col-span-2">
                        <StatusPill
                          label={paymentStatusLabel(payment.status)}
                          tone={paymentStatusTone(payment.status)}
                        />
                      </span>
                      <p className="col-span-2 text-xs text-[#9ca3af]">{payment.receiptNumber ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3 p-4 xl:hidden">
              {resident.payments.map((payment) => (
                <div key={payment.id} className="rounded-[18px] border border-white/80 bg-white/80 p-4 shadow-[0_12px_26px_rgba(8,17,31,0.05)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold tabular-nums text-[#0c1427]">
                        {formatTry(Number(payment.amount))}
                      </p>
                      <p className="mt-1 text-xs text-[#6b7280]">{formatShortDate(payment.paidAt ?? payment.createdAt)}</p>
                    </div>
                    <StatusPill
                      label={paymentStatusLabel(payment.status)}
                      tone={paymentStatusTone(payment.status)}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
                      <p className="text-[#6b7280]">Yöntem</p>
                      <p className="mt-0.5 text-[#0c1427]">{paymentMethodLabel(payment.method)}</p>
                    </div>
                    <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
                      <p className="text-[#6b7280]">Makbuz</p>
                      <p className="mt-0.5 text-[#0c1427]">{payment.receiptNumber ?? '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ResidentSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-48" />
      <div className="ledger-panel p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="ledger-panel p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
      <div className="ledger-panel p-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}
