import { z } from 'zod'
import { ExpenseCategory } from '../enums'
import { PaginationSchema } from './pagination.schemas'

export const CreateVendorSchema = z.object({
  name: z.string().min(1, 'Tedarikçi adı zorunlu'),
  taxNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Geçerli bir email girin').optional(),
  address: z.string().optional(),
  category: z.nativeEnum(ExpenseCategory).optional(),
  iban: z.string().optional(),
  contactName: z.string().optional(),
  note: z.string().optional(),
})
export type CreateVendorDto = z.infer<typeof CreateVendorSchema>

export const UpdateVendorSchema = CreateVendorSchema.partial().extend({
  isActive: z.boolean().optional(),
})
export type UpdateVendorDto = z.infer<typeof UpdateVendorSchema>

export const VendorFilterSchema = PaginationSchema.extend({
  category: z.nativeEnum(ExpenseCategory).optional(),
  isActive: z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean().optional()),
  search: z.string().optional(),
})
export type VendorFilterDto = z.infer<typeof VendorFilterSchema>
