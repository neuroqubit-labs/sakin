import { z } from 'zod'
import { TicketCategory, TicketPriority, TicketStatus } from '../enums'
import { PaginationSchema } from './pagination.schemas'

export const CreateTicketSchema = z.object({
  // RESIDENT için backend kendi occupancy'sinden türetir; client göndermese de olur.
  siteId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  category: z.nativeEnum(TicketCategory),
  priority: z.nativeEnum(TicketPriority).optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
})
export type CreateTicketDto = z.infer<typeof CreateTicketSchema>

export const UpdateTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  resolution: z.string().optional(),
  dueDate: z.coerce.date().optional(),
})
export type UpdateTicketDto = z.infer<typeof UpdateTicketSchema>

export const TicketFilterSchema = PaginationSchema.extend({
  siteId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  priority: z.nativeEnum(TicketPriority).optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  assignedToId: z.string().uuid().optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})
export type TicketFilterDto = z.infer<typeof TicketFilterSchema>

export const CreateTicketCommentSchema = z.object({
  body: z.string().min(1),
  isInternal: z.boolean().optional(),
})
export type CreateTicketCommentDto = z.infer<typeof CreateTicketCommentSchema>

// Foto yükleme. Base64 gövde; backend ~5MB sınırında kesiyor.
// MIME izin listesi imge ile sınırlı — PDF/video kabul edilmiyor.
export const ALLOWED_TICKET_ATTACHMENT_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const
export const TICKET_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024
export const TICKET_ATTACHMENT_MAX_PER_TICKET = 3

export const UploadTicketAttachmentSchema = z.object({
  mimeType: z.enum(ALLOWED_TICKET_ATTACHMENT_MIME),
  originalName: z.string().max(255).optional(),
  // data: base64-encoded dosya içeriği (data URL değil, sadece base64 gövdesi).
  data: z.string().min(1),
})
export type UploadTicketAttachmentDto = z.infer<typeof UploadTicketAttachmentSchema>
