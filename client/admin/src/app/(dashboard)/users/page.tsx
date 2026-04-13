'use client'

import { UserCog, Shield, User } from 'lucide-react'
import { UserRole } from '@sakin/shared'
import { useApiQuery } from '@/hooks/use-api'
import { PageHeader } from '@/components/surface'
import { Skeleton } from '@/components/ui/skeleton'

interface UserRow {
  id: string
  email: string | null
  phoneNumber: string | null
  displayName: string | null
  isActive: boolean
  role: UserRole
  createdAt: string
}

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  [UserRole.TENANT_ADMIN]: 'Yönetici',
  [UserRole.STAFF]: 'Personel',
  [UserRole.RESIDENT]: 'Sakin',
}

const ROLE_COLORS: Partial<Record<UserRole, string>> = {
  [UserRole.TENANT_ADMIN]: 'bg-blue-100 text-blue-700',
  [UserRole.STAFF]: 'bg-green-100 text-green-700',
  [UserRole.RESIDENT]: 'bg-gray-100 text-gray-700',
}

export default function UsersPage() {
  // Note: This queries the tenant's user list. API endpoint may need to be
  // created if not already available. For now, we use /auth/dev-bootstrap
  // pattern to show what data we have.
  const { data: usersResponse, isLoading } = useApiQuery<{ data: UserRow[] }>(
    ['tenant-users'],
    '/tenant/users',
    undefined,
    { retry: false },
  )
  const users = usersResponse?.data ?? []

  const admins = users.filter((u) => u.role === UserRole.TENANT_ADMIN)
  const staff = users.filter((u) => u.role === UserRole.STAFF)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kullanıcılar"
        subtitle="Şirket kullanıcıları ve rol yönetimi."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="ledger-panel p-4">
          <p className="ledger-label">Toplam Kullanıcı</p>
          <p className="ledger-value mt-2">{users.length}</p>
        </div>
        <div className="ledger-panel p-4">
          <p className="ledger-label">Yönetici</p>
          <p className="ledger-value mt-2">{admins.length}</p>
        </div>
        <div className="ledger-panel p-4">
          <p className="ledger-label">Personel</p>
          <p className="ledger-value mt-2">{staff.length}</p>
        </div>
      </div>

      {/* User Table */}
      <div className="ledger-panel overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 ledger-table-head text-xs">
          <span className="col-span-1" />
          <span className="col-span-3">Ad</span>
          <span className="col-span-3">İletişim</span>
          <span className="col-span-2">Rol</span>
          <span className="col-span-1">Durum</span>
          <span className="col-span-2 text-right">Kullanıcı Kodu</span>
        </div>
        <div className="ledger-divider">
          {isLoading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-5 py-4"><Skeleton className="h-10 w-full" /></div>
          ))}
          {!isLoading && users.length === 0 && (
            <div className="px-5 py-8 text-center">
              <UserCog className="h-8 w-8 mx-auto text-[#c5c6cd] mb-2" />
              <p className="text-sm text-[#6b7280]">
                Henüz kayıtlı kullanıcı bulunamadı.
              </p>
              <p className="text-xs text-[#9ca3af] mt-2">
                Kullanıcı davet sistemi yakında eklenecektir.
              </p>
            </div>
          )}
          {!isLoading && users.map((row) => (
            <div key={row.id} className="grid grid-cols-12 px-5 py-3 items-center ledger-table-row-hover">
              <div className="col-span-1">
                <div className="h-8 w-8 rounded-full bg-[#e6e8ea] grid place-items-center">
                  {row.role === UserRole.TENANT_ADMIN
                    ? <Shield className="h-4 w-4 text-[#445266]" />
                    : <User className="h-4 w-4 text-[#445266]" />}
                </div>
              </div>
              <div className="col-span-3">
                <p className="text-sm font-semibold text-[#0c1427]">
                  {row.displayName ?? 'İsimsiz Kullanıcı'}
                </p>
              </div>
              <div className="col-span-3">
                <p className="text-sm text-[#374151]">{row.email ?? '-'}</p>
                <p className="text-xs text-[#6b7280]">{row.phoneNumber ?? '-'}</p>
              </div>
              <div className="col-span-2">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[row.role] ?? 'bg-gray-100 text-gray-700'}`}>
                  {ROLE_LABELS[row.role] ?? row.role}
                </span>
              </div>
              <div className="col-span-1">
                <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${row.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {row.isActive ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              <p className="col-span-2 text-right text-[11px] text-[#9ca3af] font-mono truncate">
                {row.id.slice(0, 12)}...
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md bg-[#f0f4f8] p-4">
        <p className="text-xs text-[#445266]">
          Kullanıcı davet etme ve rol değiştirme özellikleri yakında eklenecektir.
        </p>
      </div>
    </div>
  )
}
