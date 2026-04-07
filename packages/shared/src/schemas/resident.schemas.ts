import { z } from 'zod'
import { ResidentType } from '../enums/index'

export const CreateResidentSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phoneNumber: z
    .string()
    .min(10)
    .max(15)
    .regex(/^[0-9+\s-]+$/),
  tckn: z.string().length(11).optional(),
  type: z.nativeEnum(ResidentType),
})

export const UpdateResidentSchema = CreateResidentSchema.partial()

export const ResidentFilterSchema = z.object({
  unitId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  type: z.nativeEnum(ResidentType).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateResidentDto = z.infer<typeof CreateResidentSchema>
export type UpdateResidentDto = z.infer<typeof UpdateResidentSchema>
export type ResidentFilterDto = z.infer<typeof ResidentFilterSchema>
