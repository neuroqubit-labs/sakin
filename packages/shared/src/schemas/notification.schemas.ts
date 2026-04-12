import { z } from 'zod'
import { NotificationChannel, NotificationStatus } from '../enums/index'

export const NotificationBroadcastTargetSchema = z.enum([
  'TENANT_ALL',
  'SITE',
  'UNIT',
  'RESIDENT',
])

export const CreateNotificationBroadcastSchema = z.object({
  title: z.string().min(2).max(120),
  message: z.string().min(2).max(1000),
  channel: z.nativeEnum(NotificationChannel).default(NotificationChannel.PUSH),
  templateKey: z.string().max(120).default('manual.broadcast'),
  target: NotificationBroadcastTargetSchema.default('TENANT_ALL'),
  siteId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  residentId: z.string().uuid().optional(),
  dryRun: z.boolean().default(false),
})

export const NotificationHistoryFilterSchema = z.object({
  siteId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  residentId: z.string().uuid().optional(),
  channel: z.nativeEnum(NotificationChannel).optional(),
  status: z.nativeEnum(NotificationStatus).optional(),
  search: z.string().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
})

export type NotificationBroadcastTarget = z.infer<typeof NotificationBroadcastTargetSchema>
export type CreateNotificationBroadcastDto = z.infer<typeof CreateNotificationBroadcastSchema>
export type NotificationHistoryFilterDto = z.infer<typeof NotificationHistoryFilterSchema>
