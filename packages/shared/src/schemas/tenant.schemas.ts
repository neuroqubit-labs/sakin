import { z } from 'zod'
import { GatewayMode, PaymentProvider, PlanType, UserRole } from '../enums/index'

export const CreateTenantSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Yalnızca küçük harf, rakam ve tire kullanılabilir'),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(10).max(15),
  city: z.string().min(2).max(100),
  address: z.string().max(500).optional(),
})

export const UpdateTenantSchema = CreateTenantSchema.partial().omit({ slug: true })

export const UpdateTenantPlanSchema = z.object({
  planType: z.nativeEnum(PlanType).optional(),
  smsCredits: z.number().int().min(0).optional(),
  maxUnits: z.number().int().positive().optional(),
  expiresAt: z.coerce.date().optional().nullable(),
})

export const UpsertTenantGatewayConfigSchema = z.object({
  provider: z.nativeEnum(PaymentProvider),
  mode: z.nativeEnum(GatewayMode).default(GatewayMode.TEST),
  apiKey: z.string().min(1),
  secretKey: z.string().min(1),
  merchantName: z.string().max(200).optional(),
  merchantId: z.string().max(100).optional(),
  subMerchantKey: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
})

export const AssignUserTenantRoleSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid().nullable(),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().default(true),
})

export const TenantFilterSchema = z.object({
  isActive: z.coerce.boolean().optional(),
  city: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateTenantDto = z.infer<typeof CreateTenantSchema>
export type UpdateTenantDto = z.infer<typeof UpdateTenantSchema>
export type UpdateTenantPlanDto = z.infer<typeof UpdateTenantPlanSchema>
export type TenantFilterDto = z.infer<typeof TenantFilterSchema>
export type UpsertTenantGatewayConfigDto = z.infer<typeof UpsertTenantGatewayConfigSchema>
export type AssignUserTenantRoleDto = z.infer<typeof AssignUserTenantRoleSchema>
