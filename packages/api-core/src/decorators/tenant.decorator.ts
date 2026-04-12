import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { TenantContext } from '@sakin/shared'
import type { RequestWithTenant } from '../types'

export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant & { raw?: RequestWithTenant }>()
    return (request.tenantContext ?? request.raw?.tenantContext)!
  },
)
