'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { UserRole } from '@sakin/shared'
import { getNavItemsForRole } from '@/lib/access-policy'
import { SidebarNav } from '@/components/sidebar-nav'
import { SiteProvider } from '@/providers/site-provider'
import { WorkTopbar } from '@/components/work-topbar'

interface DashboardShellProps {
  role: UserRole
  children: React.ReactNode
}

export function DashboardShell({ role, children }: DashboardShellProps) {
  const pathname = usePathname()
  const isWorkRoute = pathname.startsWith('/work')

  const navItems = useMemo(() => {
    const all = getNavItemsForRole(role)
    if (role === UserRole.STAFF) {
      return all.filter((item) => item.href.startsWith('/work'))
    }
    return all
  }, [role])

  const title = role === UserRole.STAFF ? 'Operasyon Paneli' : 'Yönetim Paneli'

  return (
    <SiteProvider>
      <div className="flex h-screen ledger-surface">
        <SidebarNav title={title} items={navItems} />
        <main className="flex-1 overflow-auto">
          {isWorkRoute && <WorkTopbar />}
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </SiteProvider>
  )
}
