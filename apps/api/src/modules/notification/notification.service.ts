import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationChannel, NotificationStatus } from '@sakin/shared'

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates an in-app PUSH notification for a confirmed payment.
   * Called after payment.CONFIRMED transitions (manual + iyzico webhook).
   * SMS/FCM push channels are Faz 2 — this writes the DB row only.
   */
  async createForPayment(
    tenantId: string,
    paymentId: string,
    unitId: string,
    amount: number,
  ): Promise<void> {
    // Resolve the resident linked to the primary occupancy of this unit
    const occupancy = await this.prisma.unitOccupancy.findFirst({
      where: { tenantId, unitId, isActive: true, isPrimaryResponsible: true },
      select: { residentId: true, resident: { select: { userId: true } } },
    })

    await this.prisma.notification.create({
      data: {
        tenantId,
        unitId,
        residentId: occupancy?.residentId ?? null,
        userId: occupancy?.resident?.userId ?? null,
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.PENDING,
        templateKey: 'payment.confirmed',
        payload: { paymentId, amount, unitId },
      },
    })
  }

  async listForUser(userId: string, tenantId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        templateKey: true,
        payload: true,
        status: true,
        channel: true,
        createdAt: true,
        sentAt: true,
      },
    })
  }

  async countUnread(userId: string, tenantId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { tenantId, userId, status: NotificationStatus.PENDING },
    })
  }
}
