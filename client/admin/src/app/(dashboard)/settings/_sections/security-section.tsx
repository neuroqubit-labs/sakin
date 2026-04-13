'use client'

import { Shield } from 'lucide-react'
import { useApiQuery } from '@/hooks/use-api'
import { SectionHeader, SectionSkeleton } from './shared'

export function SecuritySection() {
  const { data: users, isLoading } = useApiQuery<Array<{
    id: string
    displayName: string | null
    email: string | null
    role: string
    isActive: boolean
    createdAt: string
  }>>(
    ['tenant-users'],
    '/tenant/users',
  )

  if (isLoading) return <SectionSkeleton />

  const activeUsers = users?.filter((u) => u.isActive) ?? []

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Güvenlik"
        description="Erişim kontrolü ve güvenlik ayarları."
      />

      <div className="rounded-lg border border-[#e5e7eb] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide">Aktif Kullanıcılar</p>
          <span className="text-xs text-[#6b7280]">{activeUsers.length} kullanıcı</span>
        </div>
        <div className="space-y-2">
          {activeUsers.slice(0, 5).map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-md bg-[#f9fafb] px-3 py-2">
              <div>
                <p className="text-sm font-medium text-[#111827]">{user.displayName ?? user.email ?? 'İsimsiz'}</p>
                <p className="text-xs text-[#6b7280]">{user.email ?? '-'}</p>
              </div>
              <span className="text-[11px] font-semibold text-[#4b5563] bg-[#e5e7eb] rounded px-2 py-0.5">
                {user.role === 'TENANT_ADMIN' ? 'Yönetici' : 'Personel'}
              </span>
            </div>
          ))}
          {activeUsers.length === 0 && (
            <p className="text-xs text-[#6b7280]">Aktif kullanıcı bulunamadı.</p>
          )}
          {activeUsers.length > 5 && (
            <p className="text-xs text-[#6b7280] text-center pt-1">
              ve {activeUsers.length - 5} kullanıcı daha
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-[#e5e7eb] p-4 space-y-3">
        <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide">Kimlik Doğrulama</p>
        <div className="flex items-center gap-3 rounded-md bg-[#f9fafb] px-4 py-3">
          <Shield className="h-5 w-5 text-[#0c1427]" />
          <div>
            <p className="text-sm font-medium text-[#111827]">Firebase Authentication</p>
            <p className="text-xs text-[#6b7280]">E-posta + şifre ile giriş · Telefon OTP (mobil)</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#e5e7eb] p-4 space-y-4">
        <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide">Gelecek Özellikler</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-md border border-dashed border-[#d1d5db] px-4 py-3">
            <div className="h-2 w-2 rounded-full bg-[#d1d5db]" />
            <div>
              <p className="text-sm text-[#6b7280]">İki faktörlü doğrulama (2FA)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-dashed border-[#d1d5db] px-4 py-3">
            <div className="h-2 w-2 rounded-full bg-[#d1d5db]" />
            <div>
              <p className="text-sm text-[#6b7280]">Oturum yönetimi ve aktif cihazlar</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-dashed border-[#d1d5db] px-4 py-3">
            <div className="h-2 w-2 rounded-full bg-[#d1d5db]" />
            <div>
              <p className="text-sm text-[#6b7280]">İşlem logları ve denetim kaydı</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
