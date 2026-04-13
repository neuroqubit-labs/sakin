import { z } from 'zod'
import { DocumentOwnerType, DocumentType } from '../enums'
import { PaginationSchema } from './pagination.schemas'

export const CreateDocumentSchema = z.object({
  ownerType: z.nativeEnum(DocumentOwnerType),
  ownerId: z.string().uuid(),
  type: z.nativeEnum(DocumentType).optional(),
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  description: z.string().optional(),
})
export type CreateDocumentDto = z.infer<typeof CreateDocumentSchema>

export const DocumentFilterSchema = PaginationSchema.extend({
  ownerType: z.nativeEnum(DocumentOwnerType).optional(),
  ownerId: z.string().uuid().optional(),
  type: z.nativeEnum(DocumentType).optional(),
})
export type DocumentFilterDto = z.infer<typeof DocumentFilterSchema>
