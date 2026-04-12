import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { UserRole } from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@Injectable()
export class PlatformGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ tenantContext?: TenantContext; raw?: { tenantContext?: TenantContext } }>()
    const ctx = req.tenantContext ?? req.raw?.tenantContext

    if (!ctx || ctx.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Platform yetkisi gereklidir. Yalnızca SUPER_ADMIN erişebilir.')
    }

    return true
  }
}
