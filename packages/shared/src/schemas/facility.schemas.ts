import { z } from 'zod'
import { FacilityType } from '../enums'
import { PaginationSchema } from './pagination.schemas'

export const CreateFacilitySchema = z.object({
  siteId: z.string().uuid(),
  name: z.string().min(1),
  type: z.nativeEnum(FacilityType),
  description: z.string().optional(),
})
export type CreateFacilityDto = z.infer<typeof CreateFacilitySchema>

export const UpdateFacilitySchema = z.object({
  name: z.string().min(1).optional(),
  type: z.nativeEnum(FacilityType).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})
export type UpdateFacilityDto = z.infer<typeof UpdateFacilitySchema>

export const FacilityFilterSchema = PaginationSchema.extend({
  siteId: z.string().uuid().optional(),
  type: z.nativeEnum(FacilityType).optional(),
  isActive: z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean().optional()),
})
export type FacilityFilterDto = z.infer<typeof FacilityFilterSchema>
