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
