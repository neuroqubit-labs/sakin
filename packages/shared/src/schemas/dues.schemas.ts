import { z } from 'zod'

export const GenerateDuesSchema = z.object({
  siteId: z.string().uuid(),
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2020).max(2100),
  amount: z.number().positive(),
  /** Önceki dönem borçlarını da dahil et */
  dueDayOfMonth: z.number().int().min(1).max(28).default(10),
  description: z.string().max(500).optional(),
})

export const UpdateDuesSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().max(500).optional(),
})

export type GenerateDuesDto = z.infer<typeof GenerateDuesSchema>
export type UpdateDuesDto = z.infer<typeof UpdateDuesSchema>

export const DuesFilterSchema = z.object({
  siteId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  periodYear: z.coerce.number().int().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type DuesFilterDto = z.infer<typeof DuesFilterSchema>
