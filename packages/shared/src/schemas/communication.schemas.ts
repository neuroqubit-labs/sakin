import { z } from 'zod'
import { CommunicationChannel, CommunicationStatus } from '../enums'
import { PaginationSchema } from './pagination.schemas'

export const CreateCommunicationLogSchema = z.object({
  siteId: z.string().uuid().optional(),
  residentId: z.string().uuid().optional(),
  recipientPhone: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  channel: z.nativeEnum(CommunicationChannel),
  templateKey: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
})
export type CreateCommunicationLogDto = z.infer<typeof CreateCommunicationLogSchema>

export const CommunicationLogFilterSchema = PaginationSchema.extend({
  siteId: z.string().uuid().optional(),
  residentId: z.string().uuid().optional(),
  channel: z.nativeEnum(CommunicationChannel).optional(),
  status: z.nativeEnum(CommunicationStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})
export type CommunicationLogFilterDto = z.infer<typeof CommunicationLogFilterSchema>
