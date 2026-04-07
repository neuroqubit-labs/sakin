import { z } from 'zod'
import { ExportStatus, ExportType } from '../enums/index'

export const CreateExportBatchSchema = z.object({
  type: z.nativeEnum(ExportType),
  filters: z.record(z.any()).optional(),
})

export const ExportBatchFilterSchema = z.object({
  type: z.nativeEnum(ExportType).optional(),
  status: z.nativeEnum(ExportStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
})

export type CreateExportBatchDto = z.infer<typeof CreateExportBatchSchema>
export type ExportBatchFilterDto = z.infer<typeof ExportBatchFilterSchema>
