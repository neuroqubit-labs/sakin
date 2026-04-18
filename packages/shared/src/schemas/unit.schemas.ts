import { z } from 'zod'
import { UnitType } from '../enums/index'

export const CreateUnitSchema = z.object({
  siteId: z.string().uuid(),
  blockId: z.string().uuid().optional(),
  number: z.string().min(1).max(20),
  floor: z.number().int().optional(),
  type: z.nativeEnum(UnitType).default(UnitType.APARTMENT),
  area: z.number().positive().optional(),
  description: z.string().max(500).optional(),
  isStaffQuarters: z.boolean().optional(),
  isExemptFromDues: z.boolean().optional(),
  customDuesAmount: z.number().nonnegative().optional(),
})

export const UpdateUnitSchema = CreateUnitSchema.partial().omit({ siteId: true })

export const BulkCreateUnitsItemSchema = z.object({
  type: z.nativeEnum(UnitType).default(UnitType.APARTMENT),
  count: z.number().int().positive().max(500),
  blockId: z.string().uuid().optional(),
  numberingPrefix: z.string().max(10).optional(),
  numberingStart: z.number().int().positive().default(1),
  floorStart: z.number().int().optional(),
  isStaffQuarters: z.boolean().optional(),
  isExemptFromDues: z.boolean().optional(),
})

export const BulkCreateUnitsSchema = z.object({
  items: z.array(BulkCreateUnitsItemSchema).min(1).max(20),
})

export const UnitFilterSchema = z.object({
  siteId: z.string().uuid().optional(),
  blockId: z.string().uuid().optional(),
  floor: z.coerce.number().int().optional(),
  search: z.string().min(1).max(100).optional(),
  financialStatus: z.enum(['CLEAR', 'DEBTOR', 'OVERDUE']).optional(),
  isActive: z.coerce.boolean().optional(),
  type: z.nativeEnum(UnitType).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const CreateBlockSchema = z.object({
  name: z.string().min(1).max(50),
  totalUnits: z.number().int().positive(),
})

export type CreateUnitDto = z.infer<typeof CreateUnitSchema>
export type UpdateUnitDto = z.infer<typeof UpdateUnitSchema>
export type UnitFilterDto = z.infer<typeof UnitFilterSchema>
export type CreateBlockDto = z.infer<typeof CreateBlockSchema>
export type BulkCreateUnitsItemDto = z.infer<typeof BulkCreateUnitsItemSchema>
export type BulkCreateUnitsDto = z.infer<typeof BulkCreateUnitsSchema>
