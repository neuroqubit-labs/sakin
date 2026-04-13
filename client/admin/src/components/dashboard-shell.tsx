'use client'

import { useEffect, useMemo, useState } from 'react'
import { UserRole } from '@sakin/shared'
import { Menu } from 'lucide-react'
import { getNavGroupsForRole } from '@/lib/access-policy'
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
    <div className="flex h-screen ledger-mesh-bg">
      <SidebarNav title={title} mainGroups={mainGroups} bottomItems={bottomItems} />
      <MobileSidebar
        title={title}
        mainGroups={mainGroups}
        bottomItems={bottomItems}
        open={mobileOpen}
        onOpenChange={setMobileOpen}
      />
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-20">
          <div className="flex items-center lg:hidden px-4 py-2.5 border-b border-white/60 ledger-glass">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-md hover:bg-[#f3f4f6] transition-colors"
              aria-label="Menüyü aç"
            >
              <Menu className="h-5 w-5 text-[#0c1427]" />
            </button>
            <span className="ml-2 text-sm font-semibold text-[#0c1427]">Sakin</span>
          </div>
          <Topbar onPaymentClick={() => setOpenPaymentModal(true)} />
        </div>
        <div className="p-4 lg:p-6">{children}</div>
      </main>

      <PaymentCollectModal
        open={openPaymentModal}
        onClose={() => setOpenPaymentModal(false)}
        context={{ siteName: selectedSiteName }}
      />
    </div>
  )
}
