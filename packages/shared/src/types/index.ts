import type { UserRole } from '../enums/index.js'

export interface TenantContext {
  tenantId: string
  userId: string
  role: UserRole
  firebaseUid: string
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ApiResponse<T = unknown> {
  data: T
  message?: string
}

export interface ApiErrorResponse {
  statusCode: number
  message: string
  error?: string
  details?: unknown
}
