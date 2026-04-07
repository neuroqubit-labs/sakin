import { UserRole } from '@sakin/shared'

export interface AdminNavItem {
  href: string
  label: string
  roles: UserRole[]
  icon?: string
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', roles: [UserRole.TENANT_ADMIN], icon: 'DB' },
  { href: '/sites', label: 'Siteler', roles: [UserRole.TENANT_ADMIN], icon: 'ST' },
  { href: '/residents', label: 'Sakinler', roles: [UserRole.TENANT_ADMIN, UserRole.STAFF], icon: 'RS' },
  { href: '/dues', label: 'Aidatlar', roles: [UserRole.TENANT_ADMIN], icon: 'DU' },
  { href: '/payments', label: 'Ödemeler', roles: [UserRole.TENANT_ADMIN, UserRole.STAFF], icon: 'PM' },
  { href: '/reports', label: 'Raporlar', roles: [UserRole.TENANT_ADMIN], icon: 'RP' },
  { href: '/settings', label: 'Ayarlar', roles: [UserRole.TENANT_ADMIN], icon: 'AY' },
  { href: '/work', label: 'Action Center', roles: [UserRole.TENANT_ADMIN, UserRole.STAFF], icon: 'AC' },
  { href: '/work/portfolio', label: 'Portföy', roles: [UserRole.TENANT_ADMIN, UserRole.STAFF], icon: 'PF' },
  { href: '/work/units', label: 'Daireler', roles: [UserRole.TENANT_ADMIN, UserRole.STAFF], icon: 'UN' },
  { href: '/work/dues', label: 'Aidat/Tahakkuk', roles: [UserRole.TENANT_ADMIN, UserRole.STAFF], icon: 'TH' },
  { href: '/work/collections', label: 'Tahsilatlar', roles: [UserRole.TENANT_ADMIN, UserRole.STAFF], icon: 'CL' },
]

type RouteAccessPolicy = Record<string, UserRole[]>

export const ROLE_ROUTE_POLICY: RouteAccessPolicy = {
  '/dashboard': [UserRole.TENANT_ADMIN],
  '/sites': [UserRole.TENANT_ADMIN],
  '/dues': [UserRole.TENANT_ADMIN],
  '/reports': [UserRole.TENANT_ADMIN],
  '/settings': [UserRole.TENANT_ADMIN],
  '/work': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/work/portfolio': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/work/units': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/work/dues': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/work/collections': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/residents': [UserRole.TENANT_ADMIN, UserRole.STAFF],
  '/payments': [UserRole.TENANT_ADMIN, UserRole.STAFF],
}

export function getNavItemsForRole(role: UserRole | null): AdminNavItem[] {
  if (!role) return []
  return ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(role))
}

export function hasRouteAccess(pathname: string, role: UserRole | null): boolean {
  if (!role) return false

  const matchedPrefix = Object.keys(ROLE_ROUTE_POLICY)
    .sort((a, b) => b.length - a.length)
    .find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  if (!matchedPrefix) {
    return true
  }

  return ROLE_ROUTE_POLICY[matchedPrefix]!.includes(role)
}
