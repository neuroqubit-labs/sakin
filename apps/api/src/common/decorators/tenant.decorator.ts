import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { RequestWithTenant } from '../middleware/tenant.middleware'
import type { TenantContext } from '@sakin/shared'

export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant>()
    return request.tenantContext!
  },
)
