'use client'

import { useApiQuery } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { type TenantMeResponse, SectionHeader, SectionSkeleton, StatCard } from './shared'

const PLAN_LABELS: Record<string, string> = {
  TRIAL: 'Deneme',
  STARTER: 'Başlangıç',
  PROFESSIONAL: 'Profesyonel',
  ENTERPRISE: 'Kurumsal',
}

const PLAN_COLORS: Record<string, string> = {
  TRIAL: 'bg-amber-100 text-amber-800 border-amber-200',
  STARTER: 'bg-blue-100 text-blue-800 border-blue-200',
  PROFESSIONAL: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ENTERPRISE: 'bg-purple-100 text-purple-800 border-purple-200',
}

export function PlanSection() {
  const { data: tenant, isLoading } = useApiQuery<TenantMeResponse>(
    ['tenant-me'],
    '/tenant/me',
  )

  if (isLoading) return <SectionSkeleton />

  const plan = tenant?.plan
  const counts = tenant?._count

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Plan & Abonelik"
        description="Mevcut plan bilgileri ve kaynak kullanımı."
      />

      {plan && (
        <div className="rounded-lg border border-[#e5e7eb] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-bold ${PLAN_COLORS[plan.planType] ?? 'bg-gray-100 text-gray-800 border-gray-200'}`}>
              {PLAN_LABELS[plan.planType] ?? plan.planType}
            </span>
            <div>
              <p className="text-sm font-medium text-[#111827]">Aktif Plan</p>
              {plan.expiresAt ? (
                <p className="text-xs text-[#6b7280]">
                  Bitiş: {new Date(plan.expiresAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              ) : (
                <p className="text-xs text-[#6b7280]">Süresiz</p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" disabled>
            Plan Değiştir
          </Button>
        </div>
      )}

      {!plan && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Plan bilgisi bulunamadı</p>
          <p className="text-xs text-amber-700 mt-1">Destek ekibiyle iletişime geçin.</p>
        </div>
      )}

      {plan && counts && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide">Kaynak Kullanımı</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              label="Daire Sayısı"
              value={counts.units}
              max={plan.maxUnits}
            />
            <StatCard
              label="SMS Kredisi"
              value={plan.smsCredits}
              unit="kredi"
            />
            <StatCard
              label="Kayıtlı Site"
              value={counts.sites}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              label="Kayıtlı Sakin"
              value={counts.residents}
            />
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[#e5e7eb] p-4">
        <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide mb-2">Destek</p>
        <p className="text-sm text-[#4b5563]">
          Plan yükseltme, SMS kredi yüklemesi ve özel talepler için destek ekibiyle iletişime geçin.
        </p>
        <p className="text-xs text-[#9ca3af] mt-2">destek@sakin.app</p>
      </div>
    </div>
  )
}
