import { z } from 'zod'
import { SiteStaffRole } from '../enums/index'

export const CreateSiteStaffSchema = z.object({
  siteId: z.string().uuid('Geçerli bir site ID giriniz'),
  firstName: z.string().min(1, 'Ad zorunludur').max(100),
  lastName: z.string().min(1, 'Soyad zorunludur').max(100),
  phoneNumber: z.string().min(10, 'Geçerli bir telefon numarası giriniz').max(20),
  role: z.nativeEnum(SiteStaffRole),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  note: z.string().max(500).optional(),
})

export const UpdateSiteStaffSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().min(10).max(20).optional(),
  role: z.nativeEnum(SiteStaffRole).optional(),
  isActive: z.boolean().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
})

export const SiteStaffFilterSchema = z.object({
  siteId: z.string().uuid().optional(),
  role: z.nativeEnum(SiteStaffRole).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateSiteStaffDto = z.infer<typeof CreateSiteStaffSchema>
export type UpdateSiteStaffDto = z.infer<typeof UpdateSiteStaffSchema>
export type SiteStaffFilterDto = z.infer<typeof SiteStaffFilterSchema>
