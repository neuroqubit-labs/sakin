import { z } from 'zod'
import { ResidentType } from '../enums/index.js'

export const CreateResidentSchema = z.object({
  unitId: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phoneNumber: z
    .string()
    .min(10)
    .max(15)
    .regex(/^[0-9+\s-]+$/),
  type: z.nativeEnum(ResidentType),
  moveInDate: z.coerce.date().optional(),
})

export const UpdateResidentSchema = CreateResidentSchema.partial().omit({ unitId: true })

export type CreateResidentDto = z.infer<typeof CreateResidentSchema>
export type UpdateResidentDto = z.infer<typeof UpdateResidentSchema>
