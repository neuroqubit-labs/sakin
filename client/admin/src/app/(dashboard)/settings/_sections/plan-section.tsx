'use client'

import { useApiQuery } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { type TenantMeResponse, SectionHeader, SectionShell, SectionSkeleton, SoftPanel, StatCard } from './shared'

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
        <SectionShell>
          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-[22px] border border-white/85 bg-white/82 p-4 shadow-[0_14px_30px_rgba(8,17,31,0.04)]">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-xl border px-3 py-1.5 text-sm font-bold ${PLAN_COLORS[plan.planType] ?? 'bg-gray-100 text-gray-800 border-gray-200'}`}>
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
          </div>
        </SectionShell>
      )}

      {!plan && (
        <SectionShell>
          <div className="p-5">
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">Plan bilgisi bulunamadı</p>
              <p className="text-xs text-amber-700 mt-1">Destek ekibiyle iletişime geçin.</p>
            </div>
          </div>
        </SectionShell>
      )}

      {plan && counts && (
        <SectionShell>
          <div className="p-5">
            <SoftPanel>
              <p className="ledger-label mb-4">Kaynak Kullanımı</p>
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
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <StatCard
                  label="Kayıtlı Sakin"
                  value={counts.residents}
                />
              </div>
            </SoftPanel>
          </div>
        </SectionShell>
      )}

      <SectionShell>
        <div className="p-5">
          <SoftPanel>
            <p className="ledger-label mb-2">Destek</p>
            <p className="text-sm text-[#4b5563]">
              Plan yükseltme, SMS kredi yüklemesi ve özel talepler için destek ekibiyle iletişime geçin.
            </p>
            <p className="text-xs text-[#9ca3af] mt-2">destek@sakin.app</p>
          </SoftPanel>
        </div>
      </SectionShell>
    </div>
  )
}
