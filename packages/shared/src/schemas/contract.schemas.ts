import { z } from 'zod'
import { ContractStatus } from '../enums'
import { PaginationSchema } from './pagination.schemas'

export const CreateContractSchema = z.object({
  siteId: z.string().uuid(),
  vendorId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  amount: z.number().min(0).optional(),
  currency: z.string().default('TRY'),
  renewalDate: z.coerce.date().optional(),
  autoRenew: z.boolean().optional(),
})
export type CreateContractDto = z.infer<typeof CreateContractSchema>

export const UpdateContractSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(ContractStatus).optional(),
  vendorId: z.string().uuid().nullable().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  amount: z.number().min(0).optional(),
  renewalDate: z.coerce.date().nullable().optional(),
  autoRenew: z.boolean().optional(),
})
export type UpdateContractDto = z.infer<typeof UpdateContractSchema>

export const ContractFilterSchema = PaginationSchema.extend({
  siteId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  status: z.nativeEnum(ContractStatus).optional(),
})
export type ContractFilterDto = z.infer<typeof ContractFilterSchema>
