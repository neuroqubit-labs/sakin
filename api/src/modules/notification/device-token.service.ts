import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { DevicePlatform, RegisterDeviceTokenDto } from '@sakin/shared'

@Injectable()
export class DeviceTokenService {
  private readonly logger = new Logger(DeviceTokenService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Token'ı kullanıcıya bağlar. Eğer aynı token farklı kullanıcıya bağlıysa
   * yeni kullanıcıya taşınır (eski cihaz oturum kapatıp yeni hesaba girdi).
   */
  async register(userId: string, tenantId: string | null, dto: RegisterDeviceTokenDto) {
    const now = new Date()
    const existing = await this.prisma.deviceToken.findUnique({
      where: { token: dto.token },
      select: { id: true, userId: true },
    })

    if (existing) {
      const updated = await this.prisma.deviceToken.update({
        where: { id: existing.id },
        data: {
          userId,
          tenantId,
          platform: dto.platform as DevicePlatform,
          appVersion: dto.appVersion ?? null,
          lastSeenAt: now,
        },
        select: { id: true },
      })
      return { id: updated.id, reused: true }
    }

    const created = await this.prisma.deviceToken.create({
      data: {
        userId,
        tenantId,
        platform: dto.platform as DevicePlatform,
        token: dto.token,
        appVersion: dto.appVersion ?? null,
        lastSeenAt: now,
      },
      select: { id: true },
    })
    return { id: created.id, reused: false }
  }

  async unregister(userId: string, token: string) {
    const result = await this.prisma.deviceToken.deleteMany({
      where: { token, userId },
    })
    return { removed: result.count }
  }

  async getActiveTokensForUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return []
    const rows = await this.prisma.deviceToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    })
    return rows.map((r) => r.token)
  }

  async removeInvalidTokens(tokens: string[]) {
    if (tokens.length === 0) return
    await this.prisma.deviceToken.deleteMany({ where: { token: { in: tokens } } })
    this.logger.log(`Removed ${tokens.length} invalid device tokens`)
  }
}
