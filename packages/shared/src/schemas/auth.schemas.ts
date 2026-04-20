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

// Basit E.164 benzeri kontrol; Türkiye formatı +90XXXXXXXXXX (toplam 11–15 rakam).
const PhoneNumberSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{9,14}$/, 'Geçerli bir telefon numarası girin')

export const OtpRequestSchema = z.object({
  phoneNumber: PhoneNumberSchema,
})

export const OtpVerifySchema = z.object({
  phoneNumber: PhoneNumberSchema,
  code: z.string().regex(/^\d{6}$/, '6 haneli kod'),
})

export type LoginDto = z.infer<typeof LoginSchema>
export type RegisterDto = z.infer<typeof RegisterSchema>
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>
export type ResolveTenantContextDto = z.infer<typeof ResolveTenantContextSchema>
export type OtpRequestDto = z.infer<typeof OtpRequestSchema>
export type OtpVerifyDto = z.infer<typeof OtpVerifySchema>
