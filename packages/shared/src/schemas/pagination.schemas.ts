import { z } from 'zod'
import { PAGINATION } from '../constants/index'

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().positive().max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
})

export type PaginationDto = z.infer<typeof PaginationSchema>
