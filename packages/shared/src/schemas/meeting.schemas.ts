import { z } from 'zod'
import { MeetingType, MeetingStatus, DecisionResult } from '../enums'
import { PaginationSchema } from './pagination.schemas'

export const CreateMeetingSchema = z.object({
  siteId: z.string().uuid(),
  type: z.nativeEnum(MeetingType),
  title: z.string().min(1).max(200),
  agenda: z.string().optional(),
  date: z.coerce.date(),
  location: z.string().optional(),
})
export type CreateMeetingDto = z.infer<typeof CreateMeetingSchema>

export const UpdateMeetingSchema = z.object({
  type: z.nativeEnum(MeetingType).optional(),
  status: z.nativeEnum(MeetingStatus).optional(),
  title: z.string().min(1).max(200).optional(),
  agenda: z.string().optional(),
  date: z.coerce.date().optional(),
  location: z.string().optional(),
  quorumMet: z.boolean().optional(),
  attendeeCount: z.number().int().min(0).optional(),
  totalUnits: z.number().int().min(0).optional(),
  minutesUrl: z.string().url().optional(),
})
export type UpdateMeetingDto = z.infer<typeof UpdateMeetingSchema>

export const MeetingFilterSchema = PaginationSchema.extend({
  siteId: z.string().uuid().optional(),
  type: z.nativeEnum(MeetingType).optional(),
  status: z.nativeEnum(MeetingStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})
export type MeetingFilterDto = z.infer<typeof MeetingFilterSchema>

export const CreateMeetingDecisionSchema = z.object({
  orderNumber: z.number().int().positive(),
  subject: z.string().min(1),
  description: z.string().optional(),
  result: z.nativeEnum(DecisionResult),
  votesFor: z.number().int().min(0).optional(),
  votesAgainst: z.number().int().min(0).optional(),
  votesAbstain: z.number().int().min(0).optional(),
})
export type CreateMeetingDecisionDto = z.infer<typeof CreateMeetingDecisionSchema>
