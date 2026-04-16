import { z } from 'zod'
import { UserRole } from '../enums/index'

const RegisterRoleSchema = z.enum([UserRole.RESIDENT, UserRole.STAFF])

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(100).optional(),
  tenantId: z.string().uuid().nullable().optional(),
  role: RegisterRoleSchema.optional(),
})

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
})

export const ResolveTenantContextSchema = z.object({
  tenantId: z.string().uuid().nullable().optional(),
})

export type LoginDto = z.infer<typeof LoginSchema>
export type RegisterDto = z.infer<typeof RegisterSchema>
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>
export type ResolveTenantContextDto = z.infer<typeof ResolveTenantContextSchema>
