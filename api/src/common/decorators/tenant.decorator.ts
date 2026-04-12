import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { RequestWithTenant } from '../middleware/tenant.middleware'
import type { TenantContext } from '@sakin/shared'

export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant & { raw?: RequestWithTenant }>()
    // NestJS+Fastify: NestMiddleware writes to req.raw (Node.js IncomingMessage),
    // but getRequest() returns the Fastify wrapper — check both.
    return (request.tenantContext ?? request.raw?.tenantContext)!
  },
)
