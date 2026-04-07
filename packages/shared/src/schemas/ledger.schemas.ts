import { z } from 'zod'
import { LedgerEntryType } from '../enums/index'

export const LedgerFilterSchema = z.object({
  unitId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  periodYear: z.coerce.number().int().min(2020).max(2100).optional(),
  entryType: z.nativeEnum(LedgerEntryType).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
})

export const UnitStatementSchema = z.object({
  unitId: z.string().uuid(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export type LedgerFilterDto = z.infer<typeof LedgerFilterSchema>
export type UnitStatementDto = z.infer<typeof UnitStatementSchema>
