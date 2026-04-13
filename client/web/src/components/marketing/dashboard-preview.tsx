import type { ReactNode } from 'react'
import { ArrowUpRight, Bell, Building2, CircleAlert, Search, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

const debtRows = [
  { unit: 'A-12', resident: 'M. Kaya', debt: '₺8.400', tone: 'danger' },
  { unit: 'B-04', resident: 'S. Yıldız', debt: '₺3.250', tone: 'warning' },
  { unit: 'C-18', resident: 'N. Demir', debt: '₺1.200', tone: 'neutral' },
] as const

const toneClasses = {
  danger: 'bg-[#fde6df] text-[#8b2817]',
  warning: 'bg-[#f8edd9] text-[#8c5f16]',
  neutral: 'bg-white/80 text-navy-900/60',
} as const

export function DashboardPreview() {
  return (
    <div className="relative mx-auto max-w-[40rem]">
      <div className="absolute -left-12 top-16 hidden h-28 w-28 rounded-full bg-[#d9e3f5] blur-3xl lg:block" />
      <div className="absolute -right-10 bottom-12 hidden h-36 w-36 rounded-full bg-[#eadfce] blur-3xl lg:block" />

      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,242,234,0.88)_100%)] p-4 shadow-panel backdrop-blur-xl sm:p-5">
        <div className="rounded-[1.6rem] border border-navy-900/8 bg-white/72 p-4">
          <div className="flex items-center justify-between gap-4 border-b border-navy-900/8 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-navy-950 text-white">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-950">Portföy Kontrol Masası</p>
                <p className="text-xs text-navy-900/48">Aktif bina bağlamı ile günlük operasyon</p>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-2 text-xs text-navy-900/60 sm:flex">
              <Search className="h-3.5 w-3.5" />
              <span>Geciken daire, sakin veya ödeme ara</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1.3fr_0.9fr]">
            <div className="rounded-[1.4rem] bg-navy-950 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/44">Bu ay görünüm</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">Ödeme bekleyen 24 daire</h3>
                </div>
                <button className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-2 text-xs font-semibold">
                  Hızlı aksiyon
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <MetricCard label="Toplam borç" value="₺452.840" tone="text-[#ffdbd3]" />
                <MetricCard label="Tahsilat" value="₺128.400" tone="text-[#bff5c5]" />
                <MetricCard label="Geciken" value="₺94.210" tone="text-[#ffd29e]" />
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-navy-900/8 bg-[#f8f4ee] p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-navy-900/42">Hızlı durum</p>
              <div className="mt-4 space-y-3">
                <MiniCallout
                  icon={<Bell className="h-4 w-4" />}
                  title="Hatırlatma zamanı"
                  description="3 daire için bugün bilgilendirme uygun."
                />
                <MiniCallout
                  icon={<Wallet className="h-4 w-4" />}
                  title="Finans görünümü"
                  description="Tahsilat akışı bu hafta toparlanma gösteriyor."
                />
                <MiniCallout
                  icon={<CircleAlert className="h-4 w-4" />}
                  title="Dikkat isteyen kayıt"
                  description="Gecikme seviyesi yükselen bina üzerinde aksiyon önerilir."
                />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-navy-900/8 bg-white/80 p-4">
            <div className="flex items-center justify-between gap-4 border-b border-navy-900/8 pb-3">
              <div>
                <p className="text-sm font-semibold text-navy-950">Geciken ve bekleyen ödemeler</p>
                <p className="text-xs text-navy-900/48">Tahsilat ekibinin ilk bakacağı operasyon sırası</p>
              </div>
              <p className="text-xs font-medium text-navy-900/44">Son güncelleme: bugün</p>
            </div>

            <div className="mt-3 space-y-3">
              {debtRows.map((row) => (
                <div
                  key={row.unit}
                  className="grid gap-3 rounded-[1.2rem] border border-navy-900/6 bg-[#fbfaf8] px-4 py-3 sm:grid-cols-[0.8fr_1.2fr_0.8fr_0.9fr]"
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-navy-900/34">Daire</p>
                    <p className="mt-1 text-sm font-semibold text-navy-950">{row.unit}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-navy-900/34">Sakin</p>
                    <p className="mt-1 text-sm text-navy-900/72">{row.resident}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-navy-900/34">Borç</p>
                    <p className="mt-1 text-sm font-semibold text-navy-950">{row.debt}</p>
                  </div>
                  <div className="flex items-center sm:justify-end">
                    <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold', toneClasses[row.tone])}>
                      Aksiyon gerekli
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type MetricCardProps = {
  label: string
  value: string
  tone: string
}

function MetricCard({ label, value, tone }: MetricCardProps) {
  return (
    <div className="rounded-[1.1rem] bg-white/7 p-3">
      <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">{label}</p>
      <p className={cn('mt-2 text-xl font-semibold tracking-tight', tone)}>{value}</p>
    </div>
  )
}

type MiniCalloutProps = {
  icon: ReactNode
  title: string
  description: string
}

function MiniCallout({ icon, title, description }: MiniCalloutProps) {
  return (
    <div className="rounded-[1.2rem] border border-navy-900/8 bg-white/82 p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#e9eef6] text-navy-950">
          {icon}
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-navy-950">{title}</p>
          <p className="text-xs leading-6 text-navy-900/58">{description}</p>
        </div>
      </div>
    </div>
  )
}
