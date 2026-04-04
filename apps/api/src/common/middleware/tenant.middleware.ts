import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common'
import * as admin from 'firebase-admin'
import { PrismaService } from '../../prisma/prisma.service'
import type { TenantContext } from '@sakin/shared'
import { AUTH } from '@sakin/shared'

// NestJS middleware ile framework-agnostic minimal request arayüzü
export interface RequestWithTenant {
  headers: Record<string, string | string[] | undefined>
  tenantContext?: TenantContext
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: RequestWithTenant, _res: unknown, next: () => void) {
    const authHeader = req.headers[AUTH.TOKEN_HEADER] as string | undefined

    if (!authHeader?.startsWith(AUTH.BEARER_PREFIX)) {
      throw new UnauthorizedException('Authorization header gereklidir')
    }

    const token = authHeader.slice(AUTH.BEARER_PREFIX.length)

    try {
      const decoded = await admin.auth().verifyIdToken(token)

      const user = await this.prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
        select: { id: true, tenantId: true, role: true, isActive: true },
      })

      if (!user) {
        throw new UnauthorizedException('Kullanıcı bulunamadı. Lütfen kayıt olun.')
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Hesabınız devre dışı bırakılmıştır.')
      }

      req.tenantContext = {
        tenantId: user.tenantId,
        userId: user.id,
        role: user.role as TenantContext['role'],
        firebaseUid: decoded.uid,
      }

      next()
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş token')
    }
  }
}
