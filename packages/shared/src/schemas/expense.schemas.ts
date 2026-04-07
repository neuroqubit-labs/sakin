import { z } from 'zod'
import { ExpenseCategory } from '../enums/index'

export const CreateExpenseSchema = z.object({
  siteId: z.string().uuid('Geçerli bir site ID giriniz'),
  amount: z.number().positive('Tutar pozitif olmalıdır'),
  category: z.nativeEnum(ExpenseCategory),
  description: z.string().min(1, 'Açıklama zorunludur').max(500),
  date: z.coerce.date(),
  receiptUrl: z.string().url('Geçerli bir URL giriniz').optional(),
})

export const UpdateExpenseSchema = CreateExpenseSchema.partial().omit({ siteId: true })

export const ExpenseFilterSchema = z.object({
  siteId: z.string().uuid().optional(),
  category: z.nativeEnum(ExpenseCategory).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateExpenseDto = z.infer<typeof CreateExpenseSchema>
export type UpdateExpenseDto = z.infer<typeof UpdateExpenseSchema>
export type ExpenseFilterDto = z.infer<typeof ExpenseFilterSchema>
