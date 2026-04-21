'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateAnnouncementSchema, type CreateAnnouncementDto } from '@sakin/shared'
import { Megaphone, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { useSiteContext } from '@/providers/site-provider'
import { toastSuccess } from '@/lib/toast'
import { formatShortDate } from '@/lib/formatters'
import { KpiCard, PageHeader, SectionTitle, StatusPill } from '@/components/surface'
import { ScopedBreadcrumb } from '@/components/scoped-breadcrumb'
import { Button } from '@/components/ui/button'
import { SplitButton } from '@/components/ui/split-button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface AnnouncementRow {
  id: string
  title: string
  body: string
  siteId: string | null
  publishedAt: string | null
  createdAt: string
  site?: { name: string } | null
}

export default function AnnouncementsPage() {
  const { selectedSiteId, availableSites } = useSiteContext()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: announcementsResponse, isLoading } = useApiQuery<{ data: AnnouncementRow[]; meta: { total: number } }>(
    ['announcements', { siteId: selectedSiteId }],
    '/announcements',
    { siteId: selectedSiteId ?? undefined, limit: 50 },
  )
  const announcements = announcementsResponse?.data ?? []

  const createMutation = useApiMutation<AnnouncementRow, CreateAnnouncementDto>('/announcements', {
    invalidateKeys: [['announcements']],
    onSuccess: () => {
      toastSuccess('Duyuru oluşturuldu')
      setShowCreate(false)
      createForm.reset()
    },
  })

  const updateMutation = useApiMutation<AnnouncementRow, Partial<CreateAnnouncementDto> & { id: string }>(
    (vars) => `/announcements/${vars.id}`,
    {
      method: 'PATCH',
      invalidateKeys: [['announcements']],
      onSuccess: () => {
        toastSuccess('Duyuru güncellendi')
        setEditingId(null)
      },
    },
  )

  const deleteMutation = useApiMutation<void, { id: string }>(
    (vars) => `/announcements/${vars.id}`,
    {
      method: 'DELETE',
      invalidateKeys: [['announcements']],
      onSuccess: () => toastSuccess('Duyuru silindi'),
    },
  )

  const createForm = useForm<CreateAnnouncementDto>({
    resolver: zodResolver(CreateAnnouncementSchema),
    defaultValues: {
      siteId: selectedSiteId ?? undefined,
      title: '',
      body: '',
      publishedAt: new Date(),
    },
  })

  const editForm = useForm<Partial<CreateAnnouncementDto>>({
    resolver: zodResolver(CreateAnnouncementSchema.partial()),
  })

  if (selectedSiteId && createForm.getValues('siteId') !== selectedSiteId) {
    createForm.setValue('siteId', selectedSiteId)
  }

  const startEdit = (announcement: AnnouncementRow) => {
    setEditingId(announcement.id)
    editForm.reset({
      title: announcement.title,
      body: announcement.body,
      siteId: announcement.siteId ?? undefined,
    })
  }

  const published = announcements.filter((announcement) => announcement.publishedAt)
  const drafts = announcements.filter((announcement) => !announcement.publishedAt)
  const siteScoped = useMemo(
    () => announcements.filter((announcement) => !!announcement.siteId).length,
    [announcements],
  )

  return (
    <div className="space-y-6 motion-in">
      <ScopedBreadcrumb module="Duyurular" />
      <PageHeader
        title="Duyurular"
        eyebrow="İletişim Operasyonu"
        subtitle="Sakin duyurularını taslak, yayın ve hedef site bağlamıyla yönetin."
        actions={(
          <Button size="sm" onClick={() => setShowCreate((prev) => !prev)}>
            <Plus className="h-4 w-4" />
            Yeni Duyuru
          </Button>
        )}
      />

      <div className="motion-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ledger-panel p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))
        ) : (
          <>
            <KpiCard label="Toplam Duyuru" value={announcements.length} hint="Bu tenant altında kayıtlı tüm duyuru satırları." icon={Megaphone} tone="blue" />
            <KpiCard label="Yayındaki" value={published.length} hint="Sakinlere görünür durumda olan duyurular." icon={Send} tone="emerald" />
            <KpiCard label="Taslak" value={drafts.length} hint="Henüz yayına alınmamış hazırlık duyuruları." icon={Pencil} tone="amber" />
            <KpiCard label="Site Bazlı" value={siteScoped} hint="Belirli bir siteye hedeflenmiş duyurular." icon={Megaphone} tone="navy" />
          </>
        )}
      </div>

      {showCreate ? (
        <div className="ledger-panel overflow-hidden">
          <SectionTitle
            title="Yeni duyuru"
            subtitle="Başlık, içerik ve hedef site belirleyerek duyuruyu taslak veya yayında kaydedin."
          />
          <div className="p-5">
            <div className="ledger-panel-soft p-4 md:p-5">
              <Form {...createForm}>
                <form
                  onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={createForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Başlık</FormLabel>
                          <FormControl><Input placeholder="Duyuru başlığı" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="siteId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Site</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || undefined)}
                              className="ledger-input bg-white w-full"
                            >
                              <option value="">Tüm Siteler</option>
                              {availableSites.map((site) => (
                                <option key={site.id} value={site.id}>{site.name}</option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={createForm.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İçerik</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Duyuru içeriği..." rows={5} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-wrap gap-2">
                    <SplitButton
                      primaryLabel="Kaydet ve Yayınla"
                      primaryAction={() => {
                        createForm.setValue('publishedAt', new Date())
                        void createForm.handleSubmit((data) => createMutation.mutate(data))()
                      }}
                      secondaryOptions={[{
                        label: 'Taslak Kaydet',
                        action: () => {
                          createForm.setValue('publishedAt', undefined as unknown as Date)
                          void createForm.handleSubmit((data) => createMutation.mutate({ ...data, publishedAt: undefined as unknown as Date }))()
                        },
                      }]}
                      isPending={createMutation.isPending}
                      disabled={createMutation.isPending}
                    />
                    <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                      İptal
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      ) : null}

      {editingId ? (
        <div className="ledger-panel overflow-hidden">
          <SectionTitle
            title="Duyuru düzenle"
            subtitle="Başlık ve içerik tonunu güncelleyerek kaydı yeniden düzenleyin."
          />
          <div className="p-5">
            <div className="ledger-panel-soft p-4 md:p-5">
              <Form {...editForm}>
                <form
                  onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ ...data, id: editingId }))}
                  className="space-y-4"
                >
                  <FormField
                    control={editForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlık</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İçerik</FormLabel>
                        <FormControl><Textarea rows={5} {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                      İptal
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      ) : null}

      <div className="ledger-panel overflow-hidden">
        <SectionTitle
          title="Duyuru listesi"
          subtitle="Başlık, kapsam ve yayın durumu ile mevcut duyuru akışı."
        />
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-12 px-5 py-3 ledger-table-head text-xs">
              <span className="col-span-1">Durum</span>
              <span className="col-span-3">Başlık</span>
              <span className="col-span-4">İçerik</span>
              <span className="col-span-2">Tarih / Site</span>
              <span className="col-span-2 text-right">Aksiyon</span>
            </div>
            <div className="ledger-divider">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-4">
                    <Skeleton className="h-12 w-full rounded-2xl" />
                  </div>
                ))
              ) : announcements.length === 0 ? (
                <EmptyState
                  icon={Megaphone}
                  title="Henüz duyuru yok"
                  description="Sakinlerinize ilk duyurunuzu oluşturarak iletişim akışını başlatın."
                  actionLabel="İlk Duyuruyu Oluştur"
                  onAction={() => setShowCreate(true)}
                />
              ) : (
                announcements.map((announcement) => (
                  <div key={announcement.id} className="grid grid-cols-12 px-5 py-4 items-center ledger-table-row-hover">
                    <div className="col-span-1">
                      <StatusPill
                        label={announcement.publishedAt ? 'Yayında' : 'Taslak'}
                        tone={announcement.publishedAt ? 'success' : 'warning'}
                      />
                    </div>
                    <p className="col-span-3 truncate text-sm font-semibold text-[#0c1427]">{announcement.title}</p>
                    <p className="col-span-4 truncate text-sm text-[#374151]">{announcement.body}</p>
                    <div className="col-span-2">
                      <p className="text-xs text-[#6b7280]">{formatShortDate(announcement.publishedAt ?? announcement.createdAt)}</p>
                      <p className="text-[11px] text-[#9ca3af]">{announcement.site?.name ?? 'Tüm Siteler'}</p>
                    </div>
                    <div className="col-span-2 flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEdit(announcement)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-[#ba1a1a]"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate({ id: announcement.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
