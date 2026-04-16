'use client'

import { Shield } from 'lucide-react'
import { useApiQuery } from '@/hooks/use-api'
import { StatusPill } from '@/components/surface'
import { SectionHeader, SectionShell, SectionSkeleton, SoftPanel } from './shared'

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

      <SectionShell>
        <div className="p-5 space-y-4">
          <SoftPanel>
            <div className="flex items-center justify-between">
              <p className="ledger-label">Aktif Kullanıcılar</p>
              <span className="text-xs text-[#6b7280]">{activeUsers.length} kullanıcı</span>
            </div>
            <div className="mt-4 space-y-2">
              {activeUsers.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between rounded-[18px] border border-white/85 bg-white/82 px-3 py-2 shadow-[0_12px_26px_rgba(8,17,31,0.03)]">
                  <div>
                    <p className="text-sm font-medium text-[#111827]">{user.displayName ?? user.email ?? 'İsimsiz'}</p>
                    <p className="text-xs text-[#6b7280]">{user.email ?? '-'}</p>
                  </div>
                  <StatusPill label={user.role === 'TENANT_ADMIN' ? 'Yönetici' : 'Personel'} tone="neutral" />
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
          </SoftPanel>

          <SoftPanel>
            <p className="ledger-label mb-3">Kimlik Doğrulama</p>
            <div className="flex items-center gap-3 rounded-[18px] border border-white/85 bg-white/82 px-4 py-3 shadow-[0_12px_26px_rgba(8,17,31,0.03)]">
              <Shield className="h-5 w-5 text-[#0c1427]" />
              <div>
                <p className="text-sm font-medium text-[#111827]">JWT Authentication</p>
                <p className="text-xs text-[#6b7280]">E-posta + şifre ile giriş · Telefon OTP (mobil)</p>
              </div>
            </div>
          </SoftPanel>

          <SoftPanel>
            <p className="ledger-label mb-3">Gelecek Özellikler</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-[18px] border border-dashed border-[#d1d5db] px-4 py-3">
                <div className="h-2 w-2 rounded-full bg-[#d1d5db]" />
                <div>
                  <p className="text-sm text-[#6b7280]">İki faktörlü doğrulama (2FA)</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-[18px] border border-dashed border-[#d1d5db] px-4 py-3">
                <div className="h-2 w-2 rounded-full bg-[#d1d5db]" />
                <div>
                  <p className="text-sm text-[#6b7280]">Oturum yönetimi ve aktif cihazlar</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-[18px] border border-dashed border-[#d1d5db] px-4 py-3">
                <div className="h-2 w-2 rounded-full bg-[#d1d5db]" />
                <div>
                  <p className="text-sm text-[#6b7280]">İşlem logları ve denetim kaydı</p>
                </div>
              </div>
            </div>
          </SoftPanel>
        </div>
      </SectionShell>
    </div>
  )
}
