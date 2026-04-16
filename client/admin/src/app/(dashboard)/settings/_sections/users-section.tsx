'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Copy, Plus, Shield, User, UserCog, UserPlus, UserX } from 'lucide-react'
import { InviteUserSchema, type InviteUserDto, UserRole } from '@sakin/shared'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { useAuth } from '@/providers/auth-provider'
import { EmptyState } from '@/components/empty-state'
import { SectionTitle, StatusPill, KpiCard } from '@/components/surface'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toastSuccess } from '@/lib/toast'
import { formatShortDate } from '@/lib/formatters'
import { SectionHeader, SectionShell } from './shared'

interface UserRow {
  id: string
  email: string | null
  phoneNumber: string | null
  displayName: string | null
  isActive: boolean
  role: UserRole
  createdAt: string
}

interface InviteResult {
  userId: string
  email: string
  displayName: string
  role: UserRole
  tempPassword: string | null
}

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  [UserRole.TENANT_ADMIN]: 'Yönetici',
  [UserRole.STAFF]: 'Personel',
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 text-[#9ca3af] transition-colors hover:text-[#0c1427]"
      aria-label="Kopyala"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export function UsersSection() {
  const { role: myRole } = useAuth()
  const isTenantAdmin = myRole === UserRole.TENANT_ADMIN

  const [showInvite, setShowInvite] = useState(false)
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  const { data: users = [], isLoading, refetch } = useApiQuery<UserRow[]>(
    ['tenant-users'],
    '/tenant/users',
  )

  const inviteMutation = useApiMutation<InviteResult, InviteUserDto>('/tenant/users', {
    invalidateKeys: [['tenant-users']],
    onSuccess: (result) => {
      setInviteResult(result)
      form.reset()
      toastSuccess(`${result.displayName} davet edildi.`)
    },
  })

  const updateRoleMutation = useApiMutation<unknown, { userId: string; role: UserRole }>(
    (vars) => `/tenant/users/${vars.userId}`,
    {
      method: 'PATCH',
      invalidateKeys: [['tenant-users']],
      onSuccess: () => toastSuccess('Rol güncellendi.'),
    },
  )

  const deactivateMutation = useApiMutation<unknown, { userId: string }>(
    (vars) => `/tenant/users/${vars.userId}`,
    {
      method: 'DELETE',
      invalidateKeys: [['tenant-users']],
      onSuccess: () => {
        toastSuccess('Kullanıcı pasifleştirildi.')
        setDeactivatingId(null)
      },
    },
  )

  const form = useForm<InviteUserDto>({
    resolver: zodResolver(InviteUserSchema),
    defaultValues: { email: '', displayName: '', role: UserRole.STAFF },
  })

  const admins = users.filter((user) => user.role === UserRole.TENANT_ADMIN)
  const staff = users.filter((user) => user.role === UserRole.STAFF)
  const activeCount = users.filter((user) => user.isActive).length

  const recentJoin = useMemo(
    () => [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0],
    [users],
  )

  return (
    <div className="space-y-4">
      <SectionShell>
        <div className="p-5 space-y-5">
          <div className="flex items-start justify-between">
            <SectionHeader
              title="Kullanıcı Yönetimi"
              description="Yönetici ve personel kullanıcılarını davet edin, yetkilendirin ve izleyin."
            />
            {isTenantAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                  Yenile
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowInvite((prev) => !prev)
                    setInviteResult(null)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Personel Davet Et
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="ledger-panel-soft p-4 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                </div>
              ))
            ) : (
              <>
                <KpiCard label="Toplam Kullanıcı" value={users.length} icon={UserCog} tone="blue" />
                <KpiCard label="Yönetici" value={admins.length} icon={Shield} tone="navy" />
                <KpiCard label="Personel" value={staff.length} icon={User} tone="emerald" />
                <KpiCard
                  label="Aktif Kullanıcı"
                  value={activeCount}
                  hint={recentJoin ? `Son: ${recentJoin.displayName ?? recentJoin.email ?? '—'}` : undefined}
                  icon={UserPlus}
                  tone="amber"
                />
              </>
            )}
          </div>
        </div>
      </SectionShell>

      {isTenantAdmin && showInvite ? (
        <SectionShell>
          <SectionTitle
            title="Yeni kullanıcı davet et"
            subtitle="Yeni ekip üyesini ekleyin; gerekiyorsa reset linkiyle güvenli başlangıç akışını paylaşın."
          />

          <div className="p-5">
            {inviteResult ? (
              <div role="status" className="rounded-[22px] border border-green-200 bg-green-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-green-800">
                  {inviteResult.displayName} başarıyla eklendi.
                </p>
                {inviteResult.tempPassword ? (
                  <div className="space-y-1">
                    <p className="text-xs text-green-700">
                      Aşağıdaki geçici şifreyi kullanıcıya iletin.
                    </p>
                    <div className="flex items-center gap-2 rounded-xl bg-white border border-green-200 px-3 py-2">
                      <code className="flex-1 truncate text-xs text-[#374151]">{inviteResult.tempPassword}</code>
                      <CopyButton value={inviteResult.tempPassword} />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-green-700">
                    Kullanıcı zaten kayıtlı. Mevcut şifresiyle giriş yapabilir.
                  </p>
                )}
                <Button size="sm" variant="outline" onClick={() => setInviteResult(null)}>
                  Yeni Davet
                </Button>
              </div>
            ) : (
              <div className="ledger-panel-soft p-4 md:p-5">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) => inviteMutation.mutate(data))}
                    className="grid grid-cols-1 gap-4 md:grid-cols-3"
                  >
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ad Soyad</FormLabel>
                          <FormControl><Input placeholder="Ahmet Yılmaz" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-posta</FormLabel>
                          <FormControl><Input type="email" placeholder="ahmet@firma.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rol</FormLabel>
                          <FormControl>
                            <select {...field} className="ledger-input bg-white w-full h-10">
                              <option value={UserRole.STAFF}>Personel</option>
                              <option value={UserRole.TENANT_ADMIN}>Yönetici</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="md:col-span-3 flex flex-wrap gap-2">
                      <Button type="submit" disabled={inviteMutation.isPending}>
                        {inviteMutation.isPending ? 'Davet Ediliyor...' : 'Davet Et'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>
                        İptal
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </div>
        </SectionShell>
      ) : null}

      <SectionShell>
        <SectionTitle
          title="Ekip listesi"
          subtitle="Rol, durum ve katılım tarihiyle birlikte tenant kullanıcıları."
        />
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-12 px-5 py-3 ledger-table-head">
              <span className="col-span-1" />
              <span className="col-span-3">Kullanıcı</span>
              <span className="col-span-3">E-posta</span>
              <span className="col-span-2">Rol</span>
              <span className="col-span-1">Durum</span>
              <span className="col-span-1">Eklenme</span>
              <span className="col-span-1 text-right">İşlem</span>
            </div>
            <div className="ledger-divider">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-12 px-5 py-3 gap-3 items-center">
                    <Skeleton className="col-span-1 h-10 w-10 rounded-full" />
                    <Skeleton className="col-span-3 h-10 rounded-2xl" />
                    <Skeleton className="col-span-3 h-10 rounded-2xl" />
                    <Skeleton className="col-span-2 h-10 rounded-2xl" />
                    <Skeleton className="col-span-1 h-10 rounded-2xl" />
                    <Skeleton className="col-span-1 h-10 rounded-2xl" />
                    <Skeleton className="col-span-1 h-10 rounded-2xl" />
                  </div>
                ))
              ) : users.length === 0 ? (
                <EmptyState
                  icon={UserCog}
                  title="Henüz kullanıcı yok"
                  description="İlk ekip üyesini davet ederek operasyon panelini paylaşın."
                  actionLabel="Personel Davet Et"
                  onAction={() => setShowInvite(true)}
                />
              ) : (
                users.map((row) => (
                  <div key={row.id} className="grid grid-cols-12 px-5 py-4 items-center ledger-table-row-hover">
                    <div className="col-span-1">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(238,244,255,0.86))] shadow-[0_14px_30px_rgba(8,17,31,0.05)]">
                        {row.role === UserRole.TENANT_ADMIN ? (
                          <Shield className="h-4 w-4 text-[#274c84]" aria-hidden="true" />
                        ) : (
                          <User className="h-4 w-4 text-[#445266]" aria-hidden="true" />
                        )}
                      </div>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm font-semibold text-[#0c1427]">
                        {row.displayName ?? 'İsimsiz Kullanıcı'}
                      </p>
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="truncate text-sm text-[#374151]">{row.email ?? '-'}</p>
                      {row.phoneNumber ? <p className="text-xs text-[#6b7280]">{row.phoneNumber}</p> : null}
                    </div>
                    <div className="col-span-2">
                      {isTenantAdmin ? (
                        <select
                          value={row.role}
                          onChange={(e) => {
                            updateRoleMutation.mutate({ userId: row.id, role: e.target.value as UserRole })
                          }}
                          className="ledger-input bg-white text-xs py-1"
                          aria-label="Rolü değiştir"
                        >
                          <option value={UserRole.STAFF}>Personel</option>
                          <option value={UserRole.TENANT_ADMIN}>Yönetici</option>
                        </select>
                      ) : (
                        <span className="ledger-chip ledger-chip-neutral">
                          {ROLE_LABELS[row.role] ?? row.role}
                        </span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <StatusPill label={row.isActive ? 'Aktif' : 'Pasif'} tone={row.isActive ? 'success' : 'neutral'} />
                    </div>
                    <p className="col-span-1 text-xs text-[#9ca3af] tabular-nums">{formatShortDate(row.createdAt)}</p>
                    <div className="col-span-1 text-right">
                      {isTenantAdmin && row.isActive ? (
                        deactivatingId === row.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                deactivateMutation.mutate({ userId: row.id })
                              }}
                              disabled={deactivateMutation.isPending}
                              className="text-[11px] font-bold text-[#ba1a1a] transition-colors hover:text-[#93000a] disabled:opacity-50"
                            >
                              Evet
                            </button>
                            <span className="text-[#d1d5db]">·</span>
                            <button
                              type="button"
                              onClick={() => setDeactivatingId(null)}
                              className="text-[11px] text-[#6b7280] transition-colors hover:text-[#0c1427]"
                            >
                              Hayır
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeactivatingId(row.id)}
                            className="rounded-xl p-2 text-[#9ca3af] transition-colors hover:bg-[#fee2e2] hover:text-[#ba1a1a]"
                            aria-label={`${row.displayName ?? row.email} kullanıcısını pasifleştir`}
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        )
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SectionShell>
    </div>
  )
}
