import { z } from 'zod'
import { LegalCaseStage, LegalCaseStatus } from '../enums'
import { PaginationSchema } from './pagination.schemas'

export const CreateLegalCaseSchema = z.object({
  siteId: z.string().uuid(),
  unitId: z.string().uuid(),
  residentId: z.string().uuid(),
  totalDebt: z.number().positive('Toplam borç 0\'dan büyük olmalı'),
  interestRate: z.number().min(0).max(100).optional(),
  lawyerName: z.string().optional(),
  lawyerPhone: z.string().optional(),
  note: z.string().optional(),
})
export type CreateLegalCaseDto = z.infer<typeof CreateLegalCaseSchema>

export const UpdateLegalCaseSchema = z.object({
  stage: z.nativeEnum(LegalCaseStage).optional(),
  status: z.nativeEnum(LegalCaseStatus).optional(),
  collectedAmount: z.number().min(0).optional(),
  lawyerName: z.string().optional(),
  lawyerPhone: z.string().optional(),
  caseNumber: z.string().optional(),
  courtName: z.string().optional(),
  filedAt: z.coerce.date().optional(),
  settledAt: z.coerce.date().optional(),
  note: z.string().optional(),
})
export type UpdateLegalCaseDto = z.infer<typeof UpdateLegalCaseSchema>

export const LegalCaseFilterSchema = PaginationSchema.extend({
  siteId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  residentId: z.string().uuid().optional(),
  stage: z.nativeEnum(LegalCaseStage).optional(),
  status: z.nativeEnum(LegalCaseStatus).optional(),
})
export type LegalCaseFilterDto = z.infer<typeof LegalCaseFilterSchema>

export const CreateLegalCaseEventSchema = z.object({
  stage: z.nativeEnum(LegalCaseStage),
  description: z.string().min(1),
  eventDate: z.coerce.date(),
})
export type CreateLegalCaseEventDto = z.infer<typeof CreateLegalCaseEventSchema>
