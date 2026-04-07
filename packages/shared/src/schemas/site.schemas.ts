import { z } from 'zod'

export const CreateSiteSchema = z.object({
  name: z.string().min(2).max(200),
  address: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  district: z.string().max(100).optional(),
  totalUnits: z.number().int().positive(),
  hasBlocks: z.boolean().default(false),
})

export const UpdateSiteSchema = CreateSiteSchema.partial()

export type CreateSiteDto = z.infer<typeof CreateSiteSchema>
export type UpdateSiteDto = z.infer<typeof UpdateSiteSchema>
