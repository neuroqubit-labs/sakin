import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import * as admin from 'firebase-admin'
import { PrismaService } from '../../prisma/prisma.service'
import type { RegisterDto } from '@sakin/shared'
import { UserRole } from '@sakin/shared'

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Firebase token ile kullanıcıyı doğrular ve sistemde kayıt oluşturur.
   * İlk kayıt olan kullanıcı için tenant gereklidir (SUPER_ADMIN tarafından oluşturulmuş olmalı).
   */
  async register(dto: RegisterDto, tenantId: string) {
    let decoded: admin.auth.DecodedIdToken

    try {
      decoded = await admin.auth().verifyIdToken(dto.firebaseToken)
    } catch {
      throw new UnauthorizedException('Geçersiz Firebase token')
    }

    const existing = await this.prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    })

    if (existing) {
      throw new ConflictException('Bu kullanıcı zaten kayıtlı')
    }

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        firebaseUid: decoded.uid,
        email: decoded.email,
        phoneNumber: decoded.phone_number,
        displayName: dto.displayName ?? decoded.name,
        role: UserRole.RESIDENT,
      },
    })

    return { userId: user.id, tenantId: user.tenantId, role: user.role }
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        phoneNumber: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
    })
  }
}
