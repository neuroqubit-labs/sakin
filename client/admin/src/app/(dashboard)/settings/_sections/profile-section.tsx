'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { toastSuccess } from '@/lib/toast'
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
import { type TenantMeResponse, SectionHeader, SectionSkeleton, CopyableField } from './shared'

const TenantProfileSchema = z.object({
  name: z.string().min(2).max(200),
  contactEmail: z.string().email().or(z.literal('')).optional(),
  contactPhone: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
})

type TenantProfileForm = z.infer<typeof TenantProfileSchema>

export function ProfileSection() {
  const { data: tenant, isLoading } = useApiQuery<TenantMeResponse>(
    ['tenant-me'],
    '/tenant/me',
  )

  const updateMutation = useApiMutation<TenantMeResponse, TenantProfileForm>('/tenant/me', {
    method: 'PATCH',
    invalidateKeys: [['tenant-me']],
    onSuccess: () => toastSuccess('Şirket bilgileri güncellendi'),
  })

  const form = useForm<TenantProfileForm>({
    resolver: zodResolver(TenantProfileSchema),
    values: tenant ? {
      name: tenant.name,
      contactEmail: tenant.contactEmail ?? '',
      contactPhone: tenant.contactPhone ?? '',
      city: tenant.city ?? '',
      address: tenant.address ?? '',
    } : undefined,
  })

  if (isLoading) return <SectionSkeleton />

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Şirket Profili"
        description="Yönetim şirketinizin temel bilgileri. Bu bilgiler sakinlere gösterilir."
      />

      {tenant && (
        <div className="rounded-lg border border-[#e5e7eb] p-4 space-y-3">
          <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide">Sistem Bilgileri</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CopyableField label="Tenant ID" value={tenant.id} />
            <CopyableField label="Slug" value={tenant.slug} />
          </div>
          <p className="text-[11px] text-[#9ca3af]">
            Kayıt tarihi: {new Date(tenant.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-[#e5e7eb] p-4 space-y-4">
        <p className="text-xs font-semibold text-[#374151] uppercase tracking-wide">İletişim Bilgileri</p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şirket Adı</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-posta</FormLabel>
                    <FormControl><Input type="email" placeholder="info@firma.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl><Input placeholder="0352 xxx xx xx" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şehir</FormLabel>
                    <FormControl><Input placeholder="Kayseri" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adres</FormLabel>
                    <FormControl><Input placeholder="Merkez ofis adresi" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="pt-1">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
