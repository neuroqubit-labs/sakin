import { z } from 'zod'
import {
  PaymentChannel,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '../enums/index'

const ManualMethodSchema = z.enum([
  PaymentMethod.CASH,
  PaymentMethod.POS,
  PaymentMethod.BANK_TRANSFER,
])

export const CreateCheckoutSessionSchema = z
  .object({
    unitId: z.string().uuid().optional(),
    duesId: z.string().uuid().optional(),
    amount: z.number().positive().optional(),
    callbackUrl: z.string().url(),
    channel: z.nativeEnum(PaymentChannel).default(PaymentChannel.RESIDENT_WEB),
  })
  .refine((value) => value.duesId || value.unitId, {
    message: 'duesId veya unitId zorunludur',
    path: ['duesId'],
  })

export const CreateManualCollectionSchema = z
  .object({
    unitId: z.string().uuid(),
    duesId: z.string().uuid().optional(),
    amount: z.number().positive(),
    method: ManualMethodSchema,
    channel: z.nativeEnum(PaymentChannel).default(PaymentChannel.STAFF_PANEL),
    paidByResidentId: z.string().uuid().optional(),
    paidByUserId: z.string().uuid().optional(),
    note: z.string().max(500).optional(),
    receiptNumber: z.string().max(100).optional(),
    paidAt: z.coerce.date().optional(),
  })
  .refine((value) => value.method !== PaymentMethod.BANK_TRANSFER || !!value.duesId, {
    message: 'Banka transferi girişinde duesId verilmesi önerilir',
    path: ['duesId'],
  })

export const CreateManualBankTransferIntentSchema = z
  .object({
    unitId: z.string().uuid(),
    duesId: z.string().uuid().optional(),
    amount: z.number().positive(),
    channel: z.nativeEnum(PaymentChannel).default(PaymentChannel.RESIDENT_WEB),
    note: z.string().max(500).optional(),
    payerInfo: z.string().max(250).optional(),
  })

export const ConfirmManualBankTransferSchema = z.object({
  paymentId: z.string().uuid(),
  approve: z.boolean(),
  note: z.string().max(500).optional(),
})

export const PaymentFilterSchema = z.object({
  duesId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  residentId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
  method: z.nativeEnum(PaymentMethod).optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  provider: z.nativeEnum(PaymentProvider).optional(),
  channel: z.nativeEnum(PaymentChannel).optional(),
  search: z.string().min(1).max(100).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
})

export const IyzicoWebhookSchema = z.object({
  eventId: z.string().optional(),
  token: z.string().optional(),
  status: z.string().optional(),
  conversationId: z.string().optional(),
  paymentId: z.string().optional(),
  signature: z.string().optional(),
  payload: z.unknown().optional(),
}).passthrough()

export type CreateCheckoutSessionDto = z.infer<typeof CreateCheckoutSessionSchema>
export type CreateManualCollectionDto = z.infer<typeof CreateManualCollectionSchema>
export type CreateManualBankTransferIntentDto = z.infer<typeof CreateManualBankTransferIntentSchema>
export type ConfirmManualBankTransferDto = z.infer<typeof ConfirmManualBankTransferSchema>
export type PaymentFilterDto = z.infer<typeof PaymentFilterSchema>
export type IyzicoWebhookDto = z.infer<typeof IyzicoWebhookSchema>
