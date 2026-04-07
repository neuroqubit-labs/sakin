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
  dueDayOfMonth: z.number().int().min(1).max(28).default(10),
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
  status: z.nativeEnum(DuesStatus).optional(),
  search: z.string().min(1).max(100).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
})

export type GenerateDuesDto = z.infer<typeof GenerateDuesSchema>
export type UpdateDuesDto = z.infer<typeof UpdateDuesSchema>
export type WaiveDuesDto = z.infer<typeof WaiveDuesSchema>
export type DuesFilterDto = z.infer<typeof DuesFilterSchema>
