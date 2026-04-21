'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, LogOut, Repeat } from 'lucide-react'
import type { AdminNavGroup, AdminNavItem } from '@/lib/access-policy'
import { BrandLockup } from '@/components/brand-lockup'
import { useAuth } from '@/providers/auth-provider'
import { useSiteContext } from '@/providers/site-provider'
import { useApiQuery } from '@/hooks/use-api'
import { formatTry } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface SidebarNavProps {
  title: string
  mainGroups: AdminNavGroup[]
  bottomItems: AdminNavItem[]
}

interface PortfolioSiteKpi {
  id: string
  name: string
  city: string
  totalUnits: number
  collectionRate: number
  totalDebt: number
  thisMonthCollection: number
}

function ActiveSiteCard() {
  const { selectedSiteId, availableSites, hydrated } = useSiteContext()
  const { data: portfolio } = useApiQuery<PortfolioSiteKpi[]>(
    ['portfolio'],
    '/tenant/work-portfolio',
    undefined,
    { enabled: hydrated, staleTime: 60_000 },
  )

  const site = availableSites.find((s) => s.id === selectedSiteId)
  const kpi = portfolio?.find((p) => p.id === selectedSiteId)

  if (!hydrated || availableSites.length === 0) return null

  if (!site) {
    return (
      <div className="mt-3 rounded-2xl border border-white/75 bg-white/58 px-3.5 py-3 text-[11px] text-[#66778d]">
        Henüz bina seçilmedi
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-2xl border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(79,125,247,0.08))] px-3.5 py-3 shadow-[0_10px_22px_rgba(8,17,31,0.06)]">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/82 text-[#17345a] shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
          <Building2 className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-[#0f1a2b]">{site.name}</p>
          <p className="truncate text-[10px] uppercase tracking-[0.14em] text-[#7a8ca3]">{site.city}</p>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-xl bg-white/62 px-1 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8b9bb0]">Daire</p>
          <p className="text-[11px] font-semibold text-[#0f1a2b]">{site.totalUnits}</p>
        </div>
        <div className="rounded-xl bg-white/62 px-1 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8b9bb0]">Tahsilat</p>
          <p className="text-[11px] font-semibold text-[#0f1a2b]">
            {kpi ? `%${Math.round(kpi.collectionRate)}` : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-white/62 px-1 py-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8b9bb0]">Borç</p>
          <p className="text-[11px] font-semibold text-[#ba1a1a]">
            {kpi ? formatTry(kpi.totalDebt) : '—'}
          </p>
        </div>
      </div>
      <Link
        href="/sites"
        className="mt-2.5 flex items-center justify-center gap-1.5 rounded-xl border border-white/80 bg-white/72 px-2 py-1.5 text-[11px] font-semibold text-[#17345a] transition-colors hover:bg-white"
      >
        <Repeat className="h-3 w-3" />
        Binayı Değiştir
      </Link>
    </div>
  )
}

export function SidebarNav({ title, mainGroups, bottomItems }: SidebarNavProps) {
  const pathname = usePathname()
  const { signOut } = useAuth()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <aside aria-label="Ana navigasyon" className="hidden shrink-0 lg:flex lg:w-[292px] lg:p-4 xl:w-[308px] xl:p-5">
      <div className="ledger-shell-sidebar flex h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-[30px]">
        <div className="border-b border-white/70 px-5 pb-4 pt-5">
          <BrandLockup subtitle={title} minimal />
          <ActiveSiteCard />
        </div>

        <nav aria-label="Sayfa menüsü" className="flex-1 overflow-y-auto px-3 py-4">
          {mainGroups.map((group) => (
            <div key={group.label ?? '_root'} className="mb-3">
              {group.label && (
                <h2 className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8b9bb0]">
                  {group.label}
                </h2>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[13px] font-medium transition-all duration-200',
                        active
                          ? 'border border-white/85 bg-[linear-gradient(135deg,rgba(79,125,247,0.18),rgba(59,209,255,0.1))] text-[#0f1a2b] shadow-[0_14px_34px_rgba(79,125,247,0.12)]'
                          : 'text-[#50627b] hover:-translate-y-0.5 hover:bg-white/66 hover:text-[#0f1a2b]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition-colors',
                          active
                            ? 'border-white/90 bg-white/82 text-[#17345a]'
                            : 'border-transparent bg-white/42 text-[#6c7f96] group-hover:border-white/75 group-hover:bg-white/72',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-white/70 px-3 py-4">
          {bottomItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[13px] font-medium transition-all duration-200',
                  active
                    ? 'border border-white/85 bg-[linear-gradient(135deg,rgba(79,125,247,0.18),rgba(59,209,255,0.1))] text-[#0f1a2b] shadow-[0_14px_34px_rgba(79,125,247,0.12)]'
                    : 'text-[#50627b] hover:bg-white/66 hover:text-[#0f1a2b]',
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/72 text-[#6c7f96] shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
                  <Icon className="h-4 w-4" />
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-[13px] font-medium text-[#50627b] transition-all duration-200 hover:bg-[#fff1ee] hover:text-[#ba1a1a]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/72 text-[#6c7f96] shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
              <LogOut className="h-4 w-4 shrink-0" />
            </span>
            <span>Çıkış Yap</span>
          </button>
          <div className="rounded-[22px] border border-white/75 bg-white/54 px-4 py-3 text-xs leading-5 text-[#66778d]">
            Wafra Software ürünü olan Sakin Yönetim, portföy ve tahsilat operasyonunu tek çalışma yüzeyinde toplar.
          </div>
        </div>
      </div>
    </aside>
  )
}
