import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common'
import type { TenantContext } from '@sakin/shared'
import { AUTH, UserRole } from '@sakin/shared'
import type { RequestWithTenant } from '../types'

const IS_DEV = process.env['NODE_ENV'] !== 'production'
const DEV_BYPASS_HEADER = 'x-dev-tenant-id'
const TENANT_SCOPE_HEADER = 'x-tenant-id'

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  async use(req: RequestWithTenant, _res: unknown, next: () => void) {
    if (req.method === 'OPTIONS') {
      return next()
    }

    if (IS_DEV) {
      const devTenantId = req.headers[DEV_BYPASS_HEADER] as string | undefined
      if (devTenantId) {
        const ctx: TenantContext =
          devTenantId === 'super'
            ? {
                tenantId: null,
                userId: 'dev-super-admin',
                role: UserRole.SUPER_ADMIN,
                firebaseUid: 'dev-super-admin',
                userTenantRoleId: null,
              }
            : {
                tenantId: devTenantId,
                userId: 'dev-user',
                role: UserRole.TENANT_ADMIN,
                firebaseUid: 'dev-bypass',
                userTenantRoleId: null,
              }

        req.tenantContext = ctx
        return next()
      }
    }

    const authHeader = req.headers[AUTH.TOKEN_HEADER] as string | undefined
    if (!authHeader?.startsWith(AUTH.BEARER_PREFIX)) {
      throw new UnauthorizedException('Authorization header gereklidir')
    }

    const tenantId = (req.headers[TENANT_SCOPE_HEADER] as string | undefined) ?? null
    req.tenantContext = {
      tenantId,
      userId: 'verified-user',
      role: tenantId ? UserRole.STAFF : UserRole.SUPER_ADMIN,
      firebaseUid: 'token-verified',
      userTenantRoleId: null,
    }

    next()
  }
}
