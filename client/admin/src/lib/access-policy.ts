import { UserRole } from '@sakin/shared'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Building2,
  Home,
  Receipt,
  BarChart3,
  Settings,
  CircleDollarSign,
  Users,
  Megaphone,
  Wallet,
  TrendingDown,
} from 'lucide-react'
import type { AdminModule, NavigationVisibilityPolicy } from '@/lib/ui-contracts'

export interface AdminNavItem {
  href: string
  label: string
  roles: UserRole[]
  icon: LucideIcon
  module: AdminModule
  fallbackMessageKey: string | null
}

export interface AdminNavGroup {
  label: string | null
  items: AdminNavItem[]
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: '/dashboard',
    label: 'Genel Bakış',
    roles: [UserRole.TENANT_ADMIN],
    icon: LayoutDashboard,
    module: 'operations',
    fallbackMessageKey: 'auth.requires_tenant_admin',
  },
  {
    href: '/sites',
    label: 'Siteler',
    roles: [UserRole.TENANT_ADMIN],
    icon: Building2,
    module: 'operations',
    fallbackMessageKey: 'auth.requires_tenant_admin',
  },
  {
    href: '/units',
    label: 'Daireler',
    roles: [UserRole.TENANT_ADMIN],
    icon: Home,
    module: 'operations',
    fallbackMessageKey: 'auth.requires_tenant_admin',
  },
  {
    href: '/residents',
    label: 'Sakinler',
    roles: [UserRole.TENANT_ADMIN, UserRole.STAFF],
    icon: Users,
    module: 'operations',
    fallbackMessageKey: null,
  },
  {
    href: '/dues-create',
    label: 'Aidat Planla',
    roles: [UserRole.TENANT_ADMIN],
    icon: CircleDollarSign,
    module: 'finance',
    fallbackMessageKey: 'auth.requires_tenant_admin',
  },
  {
    href: '/finance',
    label: 'Tahsilat',
    roles: [UserRole.TENANT_ADMIN],
    icon: Receipt,
    module: 'finance',
    fallbackMessageKey: 'auth.requires_tenant_admin',
  },
  {
    href: '/payments',
    label: 'Ödemeler',
    roles: [UserRole.TENANT_ADMIN, UserRole.STAFF],
    icon: Receipt,
    module: 'finance',
    fallbackMessageKey: null,
  },
  {
    href: '/cash',
    label: 'Kasa & Banka',
    roles: [UserRole.TENANT_ADMIN],
    icon: Wallet,
    module: 'finance',
    fallbackMessageKey: 'auth.requires_tenant_admin',
  },
  {
    href: '/expenses',
    label: 'Giderler',
    roles: [UserRole.TENANT_ADMIN, UserRole.STAFF],
    icon: TrendingDown,
    module: 'finance',
    fallbackMessageKey: null,
  },
  {
    href: '/reports',
    label: 'Raporlar',
    roles: [UserRole.TENANT_ADMIN],
    icon: BarChart3,
    module: 'finance',
    fallbackMessageKey: 'auth.requires_tenant_admin',
  },
  {
    href: '/announcements',
    label: 'Duyurular',
    roles: [UserRole.TENANT_ADMIN, UserRole.STAFF],
    icon: Megaphone,
    module: 'communication',
    fallbackMessageKey: null,
  },
  {
    href: '/settings',
    label: 'Ayarlar',
    roles: [UserRole.TENANT_ADMIN],
    icon: Settings,
    module: 'operations',
    fallbackMessageKey: 'auth.requires_tenant_admin',
  },
]

const NAV_MODULE_ORDER: AdminModule[] = ['operations', 'finance', 'communication']
const NAV_MODULE_LABEL: Record<AdminModule, string> = {
  operations: 'Operasyon',
  finance: 'Finans',
  communication: 'İletişim',
}

const BOTTOM_NAV_HREFS = ['/settings']

type RouteAccessPolicy = Record<string, UserRole[]>

export const ROLE_ROUTE_POLICY: RouteAccessPolicy = {
  '/dashboard': [UserRole.TENANT_ADMIN],
  '/sites': [UserRole.TENANT_ADMIN],
  '/units': [UserRole.TENANT_ADMIN],
  '/residents': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/finance': [UserRole.TENANT_ADMIN],
  '/cash': [UserRole.TENANT_ADMIN],
  '/dues-create': [UserRole.TENANT_ADMIN],
  '/dues': [UserRole.TENANT_ADMIN],
  '/payments': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/expenses': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/announcements': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/reports': [UserRole.TENANT_ADMIN],
  '/users': [UserRole.TENANT_ADMIN],
  '/settings': [UserRole.TENANT_ADMIN],
  '/onboarding': [UserRole.TENANT_ADMIN],
}

export function getNavItemsForRole(role: UserRole | null): AdminNavItem[] {
  if (!role) return []
  return ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(role))
}

export function getNavGroupsForRole(role: UserRole | null): { main: AdminNavGroup[]; bottom: AdminNavItem[] } {
  if (!role) return { main: [], bottom: [] }

  const allowed = ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(role))
  const main: AdminNavGroup[] = NAV_MODULE_ORDER
    .map((moduleName) => ({
      label: NAV_MODULE_LABEL[moduleName],
      items: allowed.filter((item) => item.module === moduleName && !BOTTOM_NAV_HREFS.includes(item.href)),
    }))
    .filter((group) => group.items.length > 0)

  const allowedSet = new Set(allowed.map((item) => item.href))
  const bottom = BOTTOM_NAV_HREFS.filter((h) => allowedSet.has(h))
    .map((h) => allowed.find((i) => i.href === h)!)

  return { main, bottom }
}

export function getNavigationVisibilityPolicy(role: UserRole | null): NavigationVisibilityPolicy[] {
  if (!role) return []
  return NAV_MODULE_ORDER.map((moduleName) => {
    const visible = ADMIN_NAV_ITEMS.some(
      (item) => item.module === moduleName && item.roles.includes(role) && !BOTTOM_NAV_HREFS.includes(item.href),
    )
    return {
      role,
      module: moduleName,
      visible,
      fallbackMessageKey: visible ? null : 'auth.requires_tenant_admin',
    }
  })
}

export function getRouteFallbackMessage(pathname: string): string | null {
  const matchedItem = ADMIN_NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
  if (!matchedItem?.fallbackMessageKey) return null
  if (matchedItem.fallbackMessageKey === 'auth.requires_tenant_admin') {
    return 'Bu işlem için yönetici yetkisi gerekir.'
  }
  return 'Bu ekrana erişim yetkiniz yok.'
}

export function hasRouteAccess(pathname: string, role: UserRole | null): boolean {
  if (!role) return false

  const matchedPrefix = Object.keys(ROLE_ROUTE_POLICY)
    .sort((a, b) => b.length - a.length)
    .find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  if (!matchedPrefix) {
    return false
  }

  return ROLE_ROUTE_POLICY[matchedPrefix]!.includes(role)
}
