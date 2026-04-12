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

export const ResidentExportFilterSchema = ResidentFilterSchema.pick({
  unitId: true,
  siteId: true,
  type: true,
  isActive: true,
  search: true,
})

export const ResidentImportDryRunSchema = z.object({
  csv: z.string().min(1),
})

export const ResidentImportCommitSchema = z.object({
  csv: z.string().min(1),
  skipInvalid: z.boolean().default(true),
})

export const ResidentBulkUpdateSchema = z
  .object({
    residentIds: z.array(z.string().uuid()).min(1),
    isActive: z.boolean().optional(),
    email: z.string().email().optional(),
    phoneNumber: z
      .string()
      .min(10)
      .max(15)
      .regex(/^[0-9+\s-]+$/)
      .optional(),
    type: z.nativeEnum(ResidentType).optional(),
  })
  .refine((input) => input.isActive !== undefined || input.email || input.phoneNumber || input.type, {
    message: 'En az bir guncelleme alani gonderilmelidir',
  })

export type CreateResidentDto = z.infer<typeof CreateResidentSchema>
export type UpdateResidentDto = z.infer<typeof UpdateResidentSchema>
export type ResidentFilterDto = z.infer<typeof ResidentFilterSchema>
export type ResidentExportFilterDto = z.infer<typeof ResidentExportFilterSchema>
export type ResidentImportDryRunDto = z.infer<typeof ResidentImportDryRunSchema>
export type ResidentImportCommitDto = z.infer<typeof ResidentImportCommitSchema>
export type ResidentBulkUpdateDto = z.infer<typeof ResidentBulkUpdateSchema>
