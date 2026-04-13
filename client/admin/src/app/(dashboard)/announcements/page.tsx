'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateAnnouncementSchema, type CreateAnnouncementDto } from '@sakin/shared'
import { Plus, Megaphone, Pencil, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { useApiQuery, useApiMutation } from '@/hooks/use-api'
import { useSiteContext } from '@/providers/site-provider'
import { toastSuccess } from '@/lib/toast'
import { formatShortDate } from '@/lib/formatters'
import { PageHeader } from '@/components/surface'
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

  const startEdit = (ann: AnnouncementRow) => {
    setEditingId(ann.id)
    editForm.reset({
      title: ann.title,
      body: ann.body,
      siteId: ann.siteId ?? undefined,
    })
  }

  const published = announcements.filter((a) => a.publishedAt)
  const drafts = announcements.filter((a) => !a.publishedAt)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Duyurular"
        subtitle="Sakinlere gönderilen duyuru ve bildirimler."
        actions={
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" /> Yeni Duyuru
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="ledger-panel p-4">
          <p className="ledger-label">Toplam Duyuru</p>
          <p className="ledger-value mt-2">{announcements.length}</p>
        </div>
        <div className="ledger-panel p-4">
          <p className="ledger-label">Yayınlanan</p>
          <p className="ledger-value mt-2">{published.length}</p>
        </div>
        <div className="ledger-panel p-4">
          <p className="ledger-label">Taslak</p>
          <p className="ledger-value mt-2">{drafts.length}</p>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="ledger-panel p-5 space-y-4">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Yeni Duyuru</p>
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <FormLabel>Site (opsiyonel)</FormLabel>
                      <FormControl>
                        <select {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || undefined)} className="ledger-input bg-white w-full">
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
                      <Textarea placeholder="Duyuru içeriği..." rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
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
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>İptal</Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      {/* Edit Panel */}
      {editingId && (
        <div className="ledger-panel p-5 space-y-4">
          <p className="text-xs font-bold tracking-[0.12em] uppercase text-[#4b5968]">Duyuru Düzenle</p>
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
                    <FormControl><Input {...field} /></FormControl>
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
                    <FormControl><Textarea rows={4} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingId(null)}>İptal</Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      {/* Announcements List */}
      <div className="ledger-panel overflow-x-auto">
        <div className="min-w-[800px]">
        <div className="grid grid-cols-12 px-5 py-3 ledger-table-head text-xs">
          <span className="col-span-1">Durum</span>
          <span className="col-span-3">Başlık</span>
          <span className="col-span-4">İçerik</span>
          <span className="col-span-2">Tarih / Site</span>
          <span className="col-span-2 text-right">Aksiyon</span>
        </div>
        <div className="ledger-divider">
          {isLoading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-5 py-4"><Skeleton className="h-10 w-full" /></div>
          ))}
          {!isLoading && announcements.length === 0 && (
            <EmptyState
              icon={Megaphone}
              title="Henüz duyuru yok"
              description="Sakinlerinize ilk duyurunuzu oluşturun."
              actionLabel="İlk Duyuruyu Oluştur"
              onAction={() => setShowCreate(true)}
            />
          )}
          {!isLoading && announcements.map((ann) => (
            <div key={ann.id} className="grid grid-cols-12 px-5 py-3 items-center ledger-table-row-hover">
              <div className="col-span-1">
                <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${ann.publishedAt ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {ann.publishedAt ? 'Yayında' : 'Taslak'}
                </span>
              </div>
              <p className="col-span-3 text-sm font-semibold text-[#0c1427] truncate">{ann.title}</p>
              <p className="col-span-4 text-sm text-[#374151] truncate">{ann.body}</p>
              <div className="col-span-2">
                <p className="text-xs text-[#6b7280]">{formatShortDate(ann.publishedAt ?? ann.createdAt)}</p>
                <p className="text-[11px] text-[#9ca3af]">{ann.site?.name ?? 'Tüm Siteler'}</p>
              </div>
              <div className="col-span-2 flex justify-end gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(ann)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-[#ba1a1a]"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate({ id: ann.id })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}
