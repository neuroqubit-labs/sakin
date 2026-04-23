import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common'
import * as jwt from 'jsonwebtoken'
import { PrismaService } from '../../prisma/prisma.service'
import type { TenantContext } from '@sakin/shared'
import { AUTH, UserRole } from '@sakin/shared'

// NestJS middleware ile framework-agnostic minimal request arayüzü
// Not: NestJS+Fastify'da middleware req=raw Node.js IncomingMessage olabilir;
// tenantContext'i hem req hem de (varsa) req'e set ediyoruz.
export interface RequestWithTenant {
  method?: string
  headers: Record<string, string | string[] | undefined>
  tenantContext?: TenantContext
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

const IS_DEV = process.env['NODE_ENV'] !== 'production'
const DEV_BYPASS_HEADER = 'x-dev-tenant-id'
const TENANT_SCOPE_HEADER = 'x-tenant-id'
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-jwt-secret-change-me-in-production'

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: RequestWithTenant, _res: unknown, next: () => void) {
    // CORS preflight istekleri auth zorlamasına takılmamalı.
    if (req.method === 'OPTIONS') {
      return next()
    }

    // ─── DEV BYPASS ───────────────────────────────────────────────
    // Geliştirme ortamında JWT olmadan çalışmak için:
    // TENANT_ADMIN: Header: x-dev-tenant-id: <tenantId>
    // SUPER_ADMIN:  Header: x-dev-tenant-id: super
    if (IS_DEV) {
      const devTenantId = req.headers[DEV_BYPASS_HEADER] as string | undefined
      if (devTenantId) {
        // SUPER_ADMIN bypass
        if (devTenantId === 'super') {
          const superAdmin = await this.prisma.user.findFirst({
            where: { tenantRoles: { some: { role: UserRole.SUPER_ADMIN, isActive: true } } },
            select: { id: true },
          })
          req.tenantContext = {
            tenantId: null,
            userId: superAdmin?.id ?? 'dev-super-admin',
            role: UserRole.SUPER_ADMIN,
            userTenantRoleId: null,
          }
          return next()
        }

        // TENANT_ADMIN / RESIDENT bypass
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: devTenantId },
          select: { id: true, isActive: true },
        })
        if (tenant) {
          if (!tenant.isActive) {
            throw new UnauthorizedException('Bu tenant askıya alınmıştır.')
          }

          const devRole = req.headers['x-dev-role'] as string | undefined
          const devResidentId = req.headers['x-dev-resident-id'] as string | undefined

          // RESIDENT bypass: x-dev-role: RESIDENT + x-dev-resident-id header
          if (devRole === UserRole.RESIDENT && devResidentId) {
            const occupancy = await this.prisma.unitOccupancy.findFirst({
              where: { tenantId: devTenantId, residentId: devResidentId, isActive: true },
              select: { unitId: true },
            })
            req.tenantContext = {
              tenantId: devTenantId,
              userId: `dev-resident-${devResidentId}`,
              role: UserRole.RESIDENT,
              userTenantRoleId: null,
              unitId: occupancy?.unitId ?? null,
              residentId: devResidentId,
            }
            return next()
          }

          // x-dev-role: STAFF veya TENANT_ADMIN ile belirli rolü simüle et
          const roleFilter = devRole === UserRole.STAFF
            ? UserRole.STAFF
            : devRole === UserRole.TENANT_ADMIN
              ? UserRole.TENANT_ADMIN
              : undefined

          const tenantRole = await this.prisma.userTenantRole.findFirst({
            where: {
              tenantId: devTenantId,
              isActive: true,
              user: { isActive: true },
              ...(roleFilter ? { role: roleFilter } : {}),
            },
            select: { id: true, role: true, userId: true },
          })
          req.tenantContext = {
            tenantId: devTenantId,
            userId: tenantRole?.userId ?? 'dev-user',
            role: (tenantRole?.role as TenantContext['role']) ?? UserRole.TENANT_ADMIN,
            userTenantRoleId: tenantRole?.id ?? null,
          }
          return next()
        }
      }
    }
    // ──────────────────────────────────────────────────────────────

    const authHeader = req.headers[AUTH.TOKEN_HEADER] as string | undefined

    if (!authHeader?.startsWith(AUTH.BEARER_PREFIX)) {
      throw new UnauthorizedException('Authorization header gereklidir')
    }

    const token = authHeader.slice(AUTH.BEARER_PREFIX.length)

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email: string }

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: {
          id: true,
          isActive: true,
          tenantRoles: {
            where: { isActive: true },
            select: { id: true, tenantId: true, role: true },
          },
        },
      })

      if (!user) {
        throw new UnauthorizedException('Kullanıcı bulunamadı. Lütfen kayıt olun.')
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Hesabınız devre dışı bırakılmıştır.')
      }

      const requestedTenantId = req.headers[TENANT_SCOPE_HEADER] as string | undefined
      const roles = user.tenantRoles

      if (roles.length === 0) {
        throw new UnauthorizedException('Kullanıcının aktif tenant rolü bulunamadı.')
      }

      const defaultRole = roles[0]
      if (!defaultRole) {
        throw new UnauthorizedException('Kullanıcının aktif tenant rolü bulunamadı.')
      }

      let selectedRole = defaultRole
      if (requestedTenantId) {
        const explicitRole = roles.find((role) => role.tenantId === requestedTenantId)
        if (!explicitRole) {
          throw new UnauthorizedException('İstenen tenant için yetkiniz bulunmamaktadır.')
        }
        selectedRole = explicitRole
      } else {
        const superAdminRole = roles.find((role) => role.role === UserRole.SUPER_ADMIN)
        if (superAdminRole) {
          selectedRole = superAdminRole
        }
      }

      // Tenant bazlı roller için tenant.isActive kontrolü
      if (selectedRole.tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: selectedRole.tenantId },
          select: { isActive: true },
        })
        if (!tenant?.isActive) {
          throw new UnauthorizedException('Hesabınız askıya alınmıştır. Lütfen yöneticinizle iletişime geçin.')
        }
      }

      let unitId: string | null = null
      if (selectedRole.role === UserRole.RESIDENT && selectedRole.tenantId) {
        const occupancy = await this.prisma.unitOccupancy.findFirst({
          where: {
            tenantId: selectedRole.tenantId,
            isActive: true,
            resident: { userId: user.id },
          },
          orderBy: [{ isPrimaryResponsible: 'desc' }, { startDate: 'desc' }],
          select: { unitId: true },
        })
        unitId = occupancy?.unitId ?? null
      }

      req.tenantContext = {
        tenantId: selectedRole.tenantId ?? null,
        userId: user.id,
        role: selectedRole.role as TenantContext['role'],
        userTenantRoleId: selectedRole.id,
        unitId,
      }

      next()
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş token')
    }
  }
}
