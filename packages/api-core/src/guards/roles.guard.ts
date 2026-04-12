import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRole } from '@sakin/shared'
import { ROLES_KEY } from '../decorators/roles.decorator'
import type { RequestWithTenant } from '../types'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<RequestWithTenant & { raw?: RequestWithTenant }>()
    const role = request.tenantContext?.role ?? request.raw?.tenantContext?.role

    if (!role) {
      throw new ForbiddenException('Rol bilgisi doğrulanamadı')
    }

    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmamaktadır')
    }

    return true
  }
}
