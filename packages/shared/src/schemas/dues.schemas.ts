import { z } from 'zod'
import { DuesStatus, DuesType } from '../enums/index'

export const GenerateDuesSchema = z.object({
  siteId: z.string().uuid(),
  duesDefinitionId: z.string().uuid().optional(),
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2020).max(2100),
  amount: z.number().positive(),
  currency: z.string().length(3).default('TRY'),
  type: z.nativeEnum(DuesType).default(DuesType.AIDAT),
  dueDayOfMonth: z.number().int().min(1).max(28).optional(),
  description: z.string().max(500).optional(),
})

export const UpdateDuesSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  dueDate: z.coerce.date().optional(),
  description: z.string().max(500).optional(),
})

export const WaiveDuesSchema = z.object({
  reason: z.string().max(500).optional(),
})

export const DuesFilterSchema = z.object({
  siteId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  periodYear: z.coerce.number().int().optional(),
  status: z
    .preprocess(
      (val) =>
        typeof val === 'string' && val.includes(',')
          ? val.split(',').map((s) => s.trim())
          : val,
      z.union([z.nativeEnum(DuesStatus), z.array(z.nativeEnum(DuesStatus))]),
    )
    .optional(),
  search: z.string().min(1).max(100).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
})

export const DuesPolicyFilterSchema = z.object({
  siteId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
})

export const CreateDuesPolicySchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().min(1).max(120),
  amount: z.number().positive(),
  currency: z.string().length(3).default('TRY'),
  type: z.nativeEnum(DuesType).default(DuesType.AIDAT),
  dueDay: z.number().int().min(1).max(28),
  isActive: z.boolean().default(true),
  description: z.string().max(500).optional(),
})

export const UpdateDuesPolicySchema = CreateDuesPolicySchema.partial()

export const OpenDuesPeriodSchema = z.object({
  siteId: z.string().uuid(),
  policyId: z.string().uuid(),
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2020).max(2100),
  description: z.string().max(500).optional(),
})

export const CloseDuesPeriodSchema = z.object({
  siteId: z.string().uuid(),
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2020).max(2100),
  forceOverdue: z.boolean().default(true),
})

export const BulkUpdateAmountSchema = z.object({
  siteId: z.string().uuid(),
  periodYear: z.number().int().min(2020).max(2100),
  newAmount: z.number().positive(),
  fromMonth: z.number().int().min(1).max(12),
})

export type GenerateDuesDto = z.infer<typeof GenerateDuesSchema>
export type UpdateDuesDto = z.infer<typeof UpdateDuesSchema>
export type WaiveDuesDto = z.infer<typeof WaiveDuesSchema>
export type DuesFilterDto = z.infer<typeof DuesFilterSchema>
export type DuesPolicyFilterDto = z.infer<typeof DuesPolicyFilterSchema>
export type CreateDuesPolicyDto = z.infer<typeof CreateDuesPolicySchema>
export type UpdateDuesPolicyDto = z.infer<typeof UpdateDuesPolicySchema>
export type OpenDuesPeriodDto = z.infer<typeof OpenDuesPeriodSchema>
export type CloseDuesPeriodDto = z.infer<typeof CloseDuesPeriodSchema>
export type BulkUpdateAmountDto = z.infer<typeof BulkUpdateAmountSchema>
