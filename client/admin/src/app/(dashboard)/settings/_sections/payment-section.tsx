'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { GatewayMode, PaymentProvider } from '@sakin/shared'
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
import { SectionHeader, SectionShell, SectionSkeleton, SoftPanel } from './shared'

interface GatewayConfigResponse {
  id: string
  provider: PaymentProvider
  mode: GatewayMode
  apiKey: string
  secretKeyMasked: string
  merchantName: string | null
  merchantId: string | null
  isActive: boolean
  updatedAt: string
}

const GatewaySchema = z.object({
  apiKey: z.string().min(1, 'API Key zorunlu'),
  secretKey: z.string().optional(),
  mode: z.nativeEnum(GatewayMode),
  merchantName: z.string().optional(),
  merchantId: z.string().optional(),
  subMerchantKey: z.string().optional(),
})

type GatewayForm = z.infer<typeof GatewaySchema>

const MODE_LABELS: Record<GatewayMode, string> = {
  [GatewayMode.TEST]: 'Test (Sandbox)',
  [GatewayMode.LIVE]: 'Canlı (Production)',
}

export function PaymentSection() {
  const { data: config, isLoading } = useApiQuery<GatewayConfigResponse | null>(
    ['gateway-config'],
    '/tenant/payment-gateway',
  )

  const saveMutation = useApiMutation<GatewayConfigResponse, {
    provider: PaymentProvider
    mode: GatewayMode
    apiKey: string
    secretKey: string
    merchantName?: string
    merchantId?: string
    subMerchantKey?: string
    isActive: boolean
  }>('/tenant/payment-gateway', {
    method: 'PUT',
    invalidateKeys: [['gateway-config']],
    onSuccess: () => toastSuccess('Ödeme ayarları kaydedildi'),
  })

  const form = useForm<GatewayForm>({
    resolver: zodResolver(GatewaySchema),
    values: config ? {
      apiKey: config.apiKey,
      mode: config.mode,
      secretKey: '',
      merchantName: config.merchantName ?? '',
      merchantId: config.merchantId ?? '',
      subMerchantKey: '',
    } : { apiKey: '', mode: GatewayMode.TEST, secretKey: '', merchantName: '', merchantId: '', subMerchantKey: '' },
  })

  if (isLoading) return <SectionSkeleton />

  const isNew = !config

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Ödeme Entegrasyonu"
        description="iyzico ödeme altyapısı konfigürasyonu. Sakinlerden online tahsilat için gereklidir."
      />

      <SectionShell>
        <div className="p-5 space-y-4">
          <div className={`rounded-[20px] border p-4 flex items-center gap-3 ${
            config?.isActive
              ? 'border-green-200 bg-green-50'
              : 'border-amber-200 bg-amber-50'
          }`}>
            <div className={`h-2 w-2 rounded-full ${config?.isActive ? 'bg-green-500' : 'bg-amber-500'}`} />
            <div>
              <p className={`text-xs font-semibold ${config?.isActive ? 'text-green-800' : 'text-amber-800'}`}>
                {config?.isActive ? 'Aktif' : 'Yapılandırılmadı'}
              </p>
              {config ? (
                <p className="text-[11px] text-[#6b7280]">
                  {MODE_LABELS[config.mode]} · Son güncelleme: {new Date(config.updatedAt).toLocaleDateString('tr-TR')}
                </p>
              ) : null}
            </div>
          </div>

          <SoftPanel>
            <p className="ledger-label mb-4">iyzico API Ayarları</p>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => {
                  if (isNew && !data.secretKey?.trim()) return
                  saveMutation.mutate({
                    provider: PaymentProvider.IYZICO,
                    mode: data.mode,
                    apiKey: data.apiKey.trim(),
                    secretKey: data.secretKey?.trim() ?? '',
                    merchantName: data.merchantName?.trim() || undefined,
                    merchantId: data.merchantId?.trim() || undefined,
                    subMerchantKey: data.subMerchantKey?.trim() || undefined,
                    isActive: true,
                  })
                })}
                className="space-y-3"
              >
                <FormField
                  control={form.control}
                  name="mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ortam</FormLabel>
                      <FormControl>
                        <select {...field} className="ledger-input bg-white w-full">
                          {Object.values(GatewayMode).map((m) => (
                            <option key={m} value={m}>{MODE_LABELS[m]}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl><Input className="font-mono text-xs" placeholder="sandbox-xxxxxxxx" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="secretKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Secret Key
                          {config ? <span className="font-normal text-[#9ca3af] ml-1">({config.secretKeyMasked})</span> : null}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            className="font-mono text-xs"
                            placeholder={isNew ? 'Secret key girin' : 'Değiştirmek için girin'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="merchantName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İşyeri Adı <span className="text-[#9ca3af]">(opsiyonel)</span></FormLabel>
                        <FormControl><Input placeholder="Demo Yönetim A.Ş." {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="merchantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Merchant ID <span className="text-[#9ca3af]">(opsiyonel)</span></FormLabel>
                        <FormControl><Input className="font-mono text-xs" placeholder="iyzico merchant ID" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="subMerchantKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sub Merchant Key <span className="text-[#9ca3af]">(opsiyonel)</span></FormLabel>
                      <FormControl><Input className="font-mono text-xs" placeholder="Alt işyeri anahtarı" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <div className="pt-1">
                  <Button type="submit" disabled={saveMutation.isPending || (isNew && !form.watch('secretKey')?.trim())}>
                    {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              </form>
            </Form>
          </SoftPanel>
        </div>
      </SectionShell>
    </div>
  )
}
