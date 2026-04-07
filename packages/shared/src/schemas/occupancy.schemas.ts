import { z } from 'zod'
import { OccupancyRole } from '../enums/index'

export const CreateOccupancySchema = z.object({
  unitId: z.string().uuid(),
  residentId: z.string().uuid(),
  role: z.nativeEnum(OccupancyRole),
  isPrimaryResponsible: z.boolean().default(false),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  note: z.string().max(500).optional(),
})

export const UpdateOccupancySchema = z.object({
  role: z.nativeEnum(OccupancyRole).optional(),
  isPrimaryResponsible: z.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
  note: z.string().max(500).optional(),
})

export const OccupancyFilterSchema = z.object({
  unitId: z.string().uuid().optional(),
  residentId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
})

export type CreateOccupancyDto = z.infer<typeof CreateOccupancySchema>
export type UpdateOccupancyDto = z.infer<typeof UpdateOccupancySchema>
export type OccupancyFilterDto = z.infer<typeof OccupancyFilterSchema>
