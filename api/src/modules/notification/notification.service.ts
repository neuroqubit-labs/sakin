import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { Prisma } from '@sakin/database'
import {
  NotificationChannel,
  NotificationStatus,
  type CreateNotificationBroadcastDto,
  type NotificationBroadcastTarget,
  type NotificationHistoryFilterDto,
} from '@sakin/shared'

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
  ): Promise<{ notificationId: string; idempotentReplay: boolean }> {
    const existing = await this.prisma.notification.findFirst({
      where: {
        tenantId,
        templateKey: 'payment.confirmed',
        payload: {
          path: ['paymentId'],
          equals: paymentId,
        },
      },
      select: { id: true },
    })

    if (existing) {
      return { notificationId: existing.id, idempotentReplay: true }
    }

    // Resolve the resident linked to the primary occupancy of this unit
    const occupancy = await this.prisma.unitOccupancy.findFirst({
      where: { tenantId, unitId, isActive: true, isPrimaryResponsible: true },
      select: { residentId: true, resident: { select: { userId: true } } },
    })

    const created = await this.prisma.notification.create({
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

    return { notificationId: created.id, idempotentReplay: false }
  }

  async listForUser(userId: string, tenantId: string, limit = 20) {
    return this.prisma.notification.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        templateKey: true,
        title: true,
        body: true,
        payload: true,
        status: true,
        channel: true,
        readAt: true,
        createdAt: true,
        sentAt: true,
      },
    })
  }

  async countUnread(userId: string, tenantId: string): Promise<number> {
    // "Okunmadı" = kullanıcı henüz görmedi (readAt null). Status sadece dispatch durumu.
    return this.prisma.notification.count({
      where: { tenantId, userId, readAt: null },
    })
  }

  async markAsRead(id: string, userId: string, tenantId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, tenantId, userId },
      select: { id: true, readAt: true },
    })
    if (!notification) throw new NotFoundException('Bildirim bulunamadı')
    if (notification.readAt) return { id: notification.id, readAt: notification.readAt }
    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
      select: { id: true, readAt: true },
    })
    return updated
  }

  async markAllAsRead(userId: string, tenantId: string) {
    const now = new Date()
    const result = await this.prisma.notification.updateMany({
      where: { tenantId, userId, readAt: null },
      data: { readAt: now },
    })
    return { updated: result.count }
  }

  async createBroadcast(dto: CreateNotificationBroadcastDto, tenantId: string, senderUserId: string) {
    const recipients = await this.resolveRecipients(dto.target, tenantId, {
      siteId: dto.siteId,
      unitId: dto.unitId,
      residentId: dto.residentId,
    })

    if (dto.dryRun) {
      return {
        dryRun: true,
        recipientCount: recipients.length,
        preview: recipients.slice(0, 10),
      }
    }

    if (recipients.length === 0) {
      return {
        dryRun: false,
        recipientCount: 0,
        createdCount: 0,
      }
    }

    const created = await this.prisma.$transaction(
      recipients.map((recipient) =>
        this.prisma.notification.create({
          data: {
            tenantId,
            userId: recipient.userId,
            residentId: recipient.residentId,
            unitId: recipient.unitId,
            channel: dto.channel,
            status: NotificationStatus.SENT,
            templateKey: dto.templateKey,
            payload: {
              title: dto.title,
              message: dto.message,
              target: dto.target,
            },
            sentByUserId: senderUserId,
            sentAt: new Date(),
          },
        }),
      ),
    )

    return {
      dryRun: false,
      recipientCount: recipients.length,
      createdCount: created.length,
    }
  }

  async listHistory(filter: NotificationHistoryFilterDto, tenantId: string) {
    const where: Prisma.NotificationWhereInput = { tenantId }

    if (filter.siteId || filter.unitId) {
      where.unit = {
        ...(filter.siteId ? { siteId: filter.siteId } : {}),
        ...(filter.unitId ? { id: filter.unitId } : {}),
      }
    }
    if (filter.residentId) where.residentId = filter.residentId
    if (filter.channel) where.channel = filter.channel
    if (filter.status) where.status = filter.status

    if (filter.search) {
      where.OR = [
        { templateKey: { contains: filter.search, mode: 'insensitive' } },
        {
          resident: {
            OR: [
              { firstName: { contains: filter.search, mode: 'insensitive' } },
              { lastName: { contains: filter.search, mode: 'insensitive' } },
            ],
          },
        },
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          resident: {
            select: {
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
          unit: {
            select: {
              number: true,
              site: { select: { name: true } },
            },
          },
          sentByUser: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.notification.count({ where }),
    ])

    return {
      data,
      meta: {
        total,
        page: filter.page,
        limit: filter.limit,
        totalPages: Math.ceil(total / filter.limit),
      },
    }
  }

  private async resolveRecipients(
    target: NotificationBroadcastTarget,
    tenantId: string,
    scope: { siteId?: string; unitId?: string; residentId?: string },
  ) {
    const occupancies = await this.prisma.unitOccupancy.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(target === 'SITE' && scope.siteId ? { unit: { siteId: scope.siteId } } : {}),
        ...(target === 'UNIT' && scope.unitId ? { unitId: scope.unitId } : {}),
        ...(target === 'RESIDENT' && scope.residentId ? { residentId: scope.residentId } : {}),
      },
      select: {
        residentId: true,
        unitId: true,
        resident: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      distinct: ['residentId', 'unitId'],
    })

    return occupancies
      .map((row) => ({
        residentId: row.residentId,
        unitId: row.unitId,
        userId: row.resident.userId ?? null,
        residentName: `${row.resident.firstName} ${row.resident.lastName}`.trim(),
      }))
      .filter((row) => row.residentId)
  }
}
