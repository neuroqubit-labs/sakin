import { z } from 'zod'
import { PaymentMethod } from '../enums/index.js'

export const ManualPaymentSchema = z.object({
  duesId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.nativeEnum(PaymentMethod),
  note: z.string().max(500).optional(),
  receiptNumber: z.string().max(100).optional(),
  paidAt: z.coerce.date().optional(),
})

export type ManualPaymentDto = z.infer<typeof ManualPaymentSchema>

export const IyzicoInitiateSchema = z.object({
  duesId: z.string().uuid(),
  callbackUrl: z.string().url(),
})

export type IyzicoInitiateDto = z.infer<typeof IyzicoInitiateSchema>
