import { z } from 'zod'
import { CashAccountType, CashTransactionType, CashReferenceType } from '../enums/index'

export const CreateCashAccountSchema = z.object({
  siteId: z.string().uuid('Geçerli bir site ID giriniz'),
  name: z.string().min(1, 'Hesap adı zorunludur').max(200),
  type: z.nativeEnum(CashAccountType),
  bankName: z.string().max(200).optional(),
  iban: z.string().max(34).optional(),
  currency: z.string().default('TRY'),
})

export const UpdateCashAccountSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  bankName: z.string().max(200).nullable().optional(),
  iban: z.string().max(34).nullable().optional(),
  isActive: z.boolean().optional(),
})

export const CashAccountFilterSchema = z.object({
  siteId: z.string().uuid().optional(),
  type: z.nativeEnum(CashAccountType).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const CreateCashTransactionSchema = z.object({
  amount: z.number().positive('Tutar pozitif olmalıdır'),
  type: z.nativeEnum(CashTransactionType),
  referenceType: z.nativeEnum(CashReferenceType).optional(),
  referenceId: z.string().uuid().optional(),
  description: z.string().min(1, 'Açıklama zorunludur').max(500),
  transactionDate: z.coerce.date(),
})

export const CashTransactionFilterSchema = z.object({
  type: z.nativeEnum(CashTransactionType).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CreateCashAccountDto = z.infer<typeof CreateCashAccountSchema>
export type UpdateCashAccountDto = z.infer<typeof UpdateCashAccountSchema>
export type CashAccountFilterDto = z.infer<typeof CashAccountFilterSchema>
export type CreateCashTransactionDto = z.infer<typeof CreateCashTransactionSchema>
export type CashTransactionFilterDto = z.infer<typeof CashTransactionFilterSchema>
