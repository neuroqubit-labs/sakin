import { z } from 'zod'

export const CreateAnnouncementSchema = z.object({
  siteId: z.string().uuid('Geçerli bir site ID giriniz').optional(),
  title: z.string().min(1, 'Başlık zorunludur').max(200),
  body: z.string().min(1, 'İçerik zorunludur'),
  publishedAt: z.coerce.date().optional(),
})

export const UpdateAnnouncementSchema = CreateAnnouncementSchema.partial()

export const AnnouncementFilterSchema = z.object({
  siteId: z.string().uuid().optional(),
  publishedOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateAnnouncementDto = z.infer<typeof CreateAnnouncementSchema>
export type UpdateAnnouncementDto = z.infer<typeof UpdateAnnouncementSchema>
export type AnnouncementFilterDto = z.infer<typeof AnnouncementFilterSchema>
