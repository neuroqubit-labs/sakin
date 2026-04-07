import { z } from 'zod'
import { UserRole } from '../enums/index'

const RegisterRoleSchema = z.enum([UserRole.RESIDENT, UserRole.STAFF])

export const RegisterSchema = z.object({
  firebaseToken: z.string().min(1),
  displayName: z.string().min(1).max(100).optional(),
  tenantId: z.string().uuid().nullable().optional(),
  role: RegisterRoleSchema.optional(),
})

export const ResolveTenantContextSchema = z.object({
  tenantId: z.string().uuid().nullable().optional(),
})

export type RegisterDto = z.infer<typeof RegisterSchema>
export type ResolveTenantContextDto = z.infer<typeof ResolveTenantContextSchema>
