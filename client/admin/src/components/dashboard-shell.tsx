'use client'

import { useEffect, useMemo, useState } from 'react'
import { UserRole } from '@sakin/shared'
import { Menu } from 'lucide-react'
import { getNavGroupsForRole } from '@/lib/access-policy'
import { BrandLockup } from '@/components/brand-lockup'
import { SidebarNav } from '@/components/sidebar-nav'
import { MobileSidebar } from '@/components/mobile-sidebar'
import { SiteProvider, useSiteContext } from '@/providers/site-provider'
import { Topbar } from '@/components/topbar'
import { CommandPaletteProvider } from '@/components/command-palette'
import { PaymentCollectModal } from '@/components/payment-collect-modal'

interface DashboardShellProps {
  role: UserRole
  children: React.ReactNode
}

export function DashboardShell({ role, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const { main: mainGroups, bottom: bottomItems } = useMemo(() => {
    return getNavGroupsForRole(role)
  }, [role])

  const title = role === UserRole.STAFF ? 'Operasyon Paneli' : 'Yönetim Paneli'

  return (
    <SiteProvider>
      <CommandPaletteProvider>
        <ShellInner
          title={title}
          mainGroups={mainGroups}
          bottomItems={bottomItems}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        >
          {children}
        </ShellInner>
      </CommandPaletteProvider>
    </SiteProvider>
  )
}

interface ShellInnerProps {
  title: string
  mainGroups: ReturnType<typeof getNavGroupsForRole>['main']
  bottomItems: ReturnType<typeof getNavGroupsForRole>['bottom']
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  children: React.ReactNode
}

function ShellInner({ title, mainGroups, bottomItems, mobileOpen, setMobileOpen, children }: ShellInnerProps) {
  const { selectedSiteId, availableSites } = useSiteContext()
  const [openPaymentModal, setOpenPaymentModal] = useState(false)

  const selectedSiteName = useMemo(
    () => availableSites.find((site) => site.id === selectedSiteId)?.name,
    [availableSites, selectedSiteId],
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setOpenPaymentModal(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="relative flex min-h-screen ledger-mesh-bg">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#4f7df7]/12 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-[#3bd1ff]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#17345a]/6 blur-3xl" />
      </div>
      <SidebarNav title={title} mainGroups={mainGroups} bottomItems={bottomItems} />
      <MobileSidebar
        title={title}
        mainGroups={mainGroups}
        bottomItems={bottomItems}
        open={mobileOpen}
        onOpenChange={setMobileOpen}
      />
      <main className="relative z-10 min-w-0 flex-1 overflow-auto">
        <div className="sticky top-0 z-20">
          <div className="px-3 pt-3 lg:hidden">
            <div className="ledger-shell-topbar flex items-center gap-3 rounded-[24px] px-4 py-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-white/86 text-[#102038] shadow-[0_10px_24px_rgba(8,17,31,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"
                aria-label="Menüyü aç"
                aria-expanded={mobileOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
              <BrandLockup subtitle={title} compact className="min-w-0 flex-1" />
            </div>
          </div>
          <Topbar onPaymentClick={() => setOpenPaymentModal(true)} />
        </div>
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 p-4 lg:p-6 xl:p-8">{children}</div>
      </main>

      <PaymentCollectModal
        open={openPaymentModal}
        onClose={() => setOpenPaymentModal(false)}
        context={{ siteName: selectedSiteName }}
      />
    </div>
  )
}
