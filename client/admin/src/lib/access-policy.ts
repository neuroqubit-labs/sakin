import { UserRole } from '@sakin/shared'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Building2,
  Home,
  Users,
  Receipt,
  CreditCard,
  TrendingDown,
  Megaphone,
  BarChart3,
  UserCog,
  Settings,
} from 'lucide-react'

export interface AdminNavItem {
  href: string
  label: string
  roles: UserRole[]
  icon: LucideIcon
}

export interface AdminNavGroup {
  label: string | null
  items: AdminNavItem[]
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/dashboard', label: 'Genel Bakış', roles: [UserRole.TENANT_ADMIN, UserRole.STAFF], icon: LayoutDashboard },
  { href: '/sites', label: 'Siteler', roles: [UserRole.TENANT_ADMIN], icon: Building2 },
  { href: '/units', label: 'Daireler', roles: [UserRole.TENANT_ADMIN, UserRole.STAFF], icon: Home },
  { href: '/residents', label: 'Sakinler', roles: [UserRole.TENANT_ADMIN, UserRole.STAFF], icon: Users },
  { href: '/dues', label: 'Aidatlar', roles: [UserRole.TENANT_ADMIN, UserRole.STAFF], icon: Receipt },
  { href: '/payments', label: 'Tahsilatlar', roles: [UserRole.TENANT_ADMIN, UserRole.STAFF], icon: CreditCard },
  { href: '/expenses', label: 'Giderler', roles: [UserRole.TENANT_ADMIN, UserRole.STAFF], icon: TrendingDown },
  { href: '/announcements', label: 'Duyurular', roles: [UserRole.TENANT_ADMIN, UserRole.STAFF], icon: Megaphone },
  { href: '/reports', label: 'Raporlar', roles: [UserRole.TENANT_ADMIN, UserRole.STAFF], icon: BarChart3 },
  { href: '/users', label: 'Kullanıcılar', roles: [UserRole.TENANT_ADMIN], icon: UserCog },
  { href: '/settings', label: 'Ayarlar', roles: [UserRole.TENANT_ADMIN], icon: Settings },
]

const NAV_GROUPS: Array<{ label: string | null; hrefs: string[] }> = [
  { label: null, hrefs: ['/dashboard'] },
  { label: 'Yönetim', hrefs: ['/sites', '/units', '/residents'] },
  { label: 'Finans', hrefs: ['/dues', '/payments', '/expenses'] },
  { label: 'İletişim', hrefs: ['/announcements'] },
  { label: 'Analiz', hrefs: ['/reports'] },
]

const BOTTOM_NAV_HREFS = ['/users', '/settings']

type RouteAccessPolicy = Record<string, UserRole[]>

export const ROLE_ROUTE_POLICY: RouteAccessPolicy = {
  '/dashboard': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/sites': [UserRole.TENANT_ADMIN],
  '/units': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/residents': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/dues': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/payments': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/expenses': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/announcements': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/reports': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/users': [UserRole.TENANT_ADMIN],
  '/settings': [UserRole.TENANT_ADMIN],
}

export function getNavItemsForRole(role: UserRole | null): AdminNavItem[] {
  if (!role) return []
  return ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(role))
}

export function getNavGroupsForRole(role: UserRole | null): { main: AdminNavGroup[]; bottom: AdminNavItem[] } {
  if (!role) return { main: [], bottom: [] }

  const allowed = ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(role))
  const allowedSet = new Set(allowed.map((i) => i.href))

  const main: AdminNavGroup[] = NAV_GROUPS
    .map((group) => ({
      label: group.label,
      items: group.hrefs.filter((h) => allowedSet.has(h)).map((h) => allowed.find((i) => i.href === h)!),
    }))
    .filter((group) => group.items.length > 0)

  const bottom = BOTTOM_NAV_HREFS
    .filter((h) => allowedSet.has(h))
    .map((h) => allowed.find((i) => i.href === h)!)

  return { main, bottom }
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
