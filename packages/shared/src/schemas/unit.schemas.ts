import { z } from 'zod'
import { UnitType } from '../enums/index.js'

export const CreateUnitSchema = z.object({
  siteId: z.string().uuid(),
  blockId: z.string().uuid().optional(),
  number: z.string().min(1).max(20),
  floor: z.number().int().optional(),
  type: z.nativeEnum(UnitType).default(UnitType.APARTMENT),
  area: z.number().positive().optional(),
  description: z.string().max(500).optional(),
})

export const UpdateUnitSchema = CreateUnitSchema.partial().omit({ siteId: true })

export type CreateUnitDto = z.infer<typeof CreateUnitSchema>
export type UpdateUnitDto = z.infer<typeof UpdateUnitSchema>
