import type { TenantContext } from '@sakin/shared'

export interface RequestWithTenant {
  method?: string
  headers: Record<string, string | string[] | undefined>
  tenantContext?: TenantContext
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}
