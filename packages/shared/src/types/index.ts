import type { UserRole } from '../enums/index'

export interface TenantContext {
  tenantId: string | null
  userId: string
  role: UserRole
  firebaseUid: string
  userTenantRoleId?: string | null
  /** Yalnızca RESIDENT rolü için doldurulur: aktif UnitOccupancy'den gelen daire ID'si */
  unitId?: string | null
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

export type RouteAccessPolicy = Record<string, UserRole[]>

export interface WorkQueryParams {
  siteId?: string
  page?: number
  limit?: number
  search?: string
  status?: string
  dateFrom?: Date
  dateTo?: Date
}
