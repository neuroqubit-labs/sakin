import { z } from 'zod'

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

export type CreateTenantDto = z.infer<typeof CreateTenantSchema>
export type UpdateTenantDto = z.infer<typeof UpdateTenantSchema>
