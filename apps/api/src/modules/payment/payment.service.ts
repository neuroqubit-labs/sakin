import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import type { Prisma } from '@sakin/database'
import { PrismaService } from '../../prisma/prisma.service'
import { IyzicoService } from './iyzico.service'
import {
  DuesStatus,
  LedgerEntryType,
  LedgerReferenceType,
  PaymentAttemptStatus,
  PaymentMethod,
  ProviderEventStatus,
  PaymentProvider,
  PaymentStatus,
  UserRole,
  type ConfirmManualBankTransferDto,
  type CreateCheckoutSessionDto,
  type CreateManualBankTransferIntentDto,
  type CreateManualCollectionDto,
  type PaymentFilterDto,
} from '@sakin/shared'
import { randomUUID } from 'crypto'
import { LedgerService } from '../ledger/ledger.service'
import { NotificationService } from '../notification/notification.service'
import { calculateDuesStatus, toMoneyNumber } from '../../common/finance/finance.utils'
import { AUDIT_ACTIONS } from '../../common/audit/audit-actions'

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly iyzico: IyzicoService,
    private readonly ledgerService: LedgerService,
    private readonly notificationService: NotificationService,
  ) {}

  async createCheckoutSession(
    dto: CreateCheckoutSessionDto,
    tenantId: string,
    userId: string,
    role: UserRole,
  ) {
    const db = this.prisma.forTenant(tenantId)

    let duesId = dto.duesId ?? null
    let unitId = dto.unitId ?? null
    let amount = dto.amount ?? null

    if (duesId) {
      const dues = await db.dues.findFirst({
        where: { id: duesId },
        select: {
          id: true,
          unitId: true,
          amount: true,
          dueDate: true,
          status: true,
        },
      })
      if (!dues) throw new NotFoundException('Aidat kaydı bulunamadı')
      if (dues.status === DuesStatus.WAIVED || dues.status === DuesStatus.CANCELLED) {
        throw new BadRequestException('Bu aidat için ödeme başlatılamaz')
      }

      if (dto.unitId && dto.unitId !== dues.unitId) {
        throw new BadRequestException({
          code: 'PAYMENT_DUES_UNIT_MISMATCH',
          message: 'Aidat ve daire eşleşmiyor',
        })
      }

      const remaining = await this.getDuesRemainingBalanceFromLedger(db, tenantId, dues.id)

      if (remaining <= 0) {
        throw new BadRequestException('Bu aidat tamamen ödenmiş görünüyor')
      }

      if (amount !== null && amount > remaining + 0.001) {
        throw new BadRequestException({
          code: 'PAYMENT_AMOUNT_EXCEEDS_DUES_REMAINING',
          message: 'Ödeme tutarı açık borcu aşamaz',
        })
      }

      unitId = dues.unitId
      amount = amount ?? remaining
    }

    if (!unitId) {
      throw new BadRequestException('unitId/duesId bilgisi gereklidir')
    }

    const unit = await db.unit.findFirst({ where: { id: unitId, isActive: true } })
    if (!unit) throw new NotFoundException('Daire bulunamadı')

    if (!duesId) {
      const unitOutstanding = await this.getUnitOutstandingBalanceFromLedger(db, unitId)
      if (unitOutstanding <= 0) {
        throw new BadRequestException('Bu daire için açık borç bulunmuyor')
      }

      if (amount !== null && amount > unitOutstanding + 0.001) {
        throw new BadRequestException({
          code: 'PAYMENT_AMOUNT_EXCEEDS_UNIT_REMAINING',
          message: 'Ödeme tutarı dairenin açık borcunu aşamaz',
        })
      }

      amount = amount ?? unitOutstanding
    }

    if (!amount) {
      throw new BadRequestException('unitId/duesId ve amount bilgisi gereklidir')
    }

    await this.assertResidentUnitAccess(db, tenantId, unitId, userId, role)

    const [primaryOccupancy] = await Promise.all([
      db.unitOccupancy.findMany({
        where: {
          unitId,
          isActive: true,
        },
        include: { resident: true },
        orderBy: [{ isPrimaryResponsible: 'desc' }, { createdAt: 'asc' }],
        take: 1,
      }),
    ])

    const conversationId = randomUUID()

    const payment = await db.payment.create({
      data: {
        tenantId,
        unitId,
        duesId,
        amount,
        currency: 'TRY',
        method: PaymentMethod.ONLINE_CARD,
        channel: dto.channel,
        provider: PaymentProvider.IYZICO,
        status: PaymentStatus.PENDING,
        paidByUserId: userId,
        conversationId,
      },
    })

    const attempt = await db.paymentAttempt.create({
      data: {
        tenantId,
        paymentId: payment.id,
        unitId,
        duesId,
        initiatedByUserId: userId,
        amount,
        currency: 'TRY',
        provider: PaymentProvider.IYZICO,
        method: PaymentMethod.ONLINE_CARD,
        channel: dto.channel,
        status: PaymentAttemptStatus.INITIATED,
        conversationId,
        callbackUrl: dto.callbackUrl,
      },
    })

    const buyer = primaryOccupancy[0]?.resident
    const result = await this.iyzico.initiateCheckoutForm({
      tenantId,
      conversationId,
      duesId: duesId ?? undefined,
      amount,
      callbackUrl: dto.callbackUrl,
      buyer: {
        name: buyer?.firstName ?? 'Sakin',
        surname: buyer?.lastName ?? 'Kullanıcı',
        phoneNumber: buyer?.phoneNumber ?? '05000000000',
        email: buyer?.email ?? undefined,
      },
    })

    if (result.status !== 'success' || !result.token) {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, failedAt: new Date() },
      })
      await db.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: PaymentAttemptStatus.FAILED, processedAt: new Date() },
      })
      throw new InternalServerErrorException(result.errorMessage ?? 'iyzico oturumu oluşturulamadı')
    }

    await db.payment.update({
      where: { id: payment.id },
      data: {
        providerToken: result.token,
      },
    })

    await db.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        providerToken: result.token,
        status: PaymentAttemptStatus.PENDING,
      },
    })

    return {
      paymentId: payment.id,
      attemptId: attempt.id,
      token: result.token,
      checkoutFormContent: result.checkoutFormContent,
      amount,
      currency: 'TRY',
    }
  }

  async createManualCollection(dto: CreateManualCollectionDto, tenantId: string, userId: string) {
    const db = this.prisma.forTenant(tenantId)

    const unit = await db.unit.findFirst({ where: { id: dto.unitId } })
    if (!unit) throw new NotFoundException('Daire bulunamadı')

    if (dto.duesId) {
      const dues = await db.dues.findFirst({ where: { id: dto.duesId } })
      if (!dues) throw new NotFoundException('Aidat kaydı bulunamadı')
      if (dues.unitId !== dto.unitId) {
        throw new BadRequestException('Aidat ve daire eşleşmiyor')
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          tenantId,
          unitId: dto.unitId,
          duesId: dto.duesId,
          amount: dto.amount,
          currency: 'TRY',
          method: dto.method,
          channel: dto.channel,
          provider: PaymentProvider.MANUAL,
          status: PaymentStatus.CONFIRMED,
          paidByResidentId: dto.paidByResidentId,
          paidByUserId: dto.paidByUserId ?? userId,
          approvedByUserId: userId,
          paidAt: dto.paidAt ?? new Date(),
          confirmedAt: new Date(),
          note: dto.note,
          receiptNumber: dto.receiptNumber,
        },
      })

      await this.ledgerService.createEntry(
        {
          tenantId,
          unitId: dto.unitId,
          amount: dto.amount * -1,
          currency: 'TRY',
          entryType: LedgerEntryType.PAYMENT,
          referenceType: LedgerReferenceType.PAYMENT,
          referenceId: payment.id,
          idempotencyKey: `payment-confirmed-${payment.id}`,
          effectiveAt: payment.paidAt ?? new Date(),
          createdByUserId: userId,
          note: dto.note,
          metadata: {
            method: payment.method,
            channel: payment.channel,
            provider: payment.provider,
          },
        },
        tx as unknown as PrismaService,
      )

      if (payment.duesId) {
        await this.refreshDuesStatus(payment.duesId, tenantId, tx as unknown as PrismaService)
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: AUDIT_ACTIONS.PAYMENT_MANUAL_CONFIRMED,
          entity: 'Payment',
          entityId: payment.id,
          changes: {
            amount: dto.amount,
            method: dto.method,
            channel: dto.channel,
          },
        },
      })

      void this.notificationService.createForPayment(
        tenantId,
        payment.id,
        payment.unitId,
        toMoneyNumber(payment.amount),
      )

      return payment
    })
  }

  async createManualBankTransferIntent(
    dto: CreateManualBankTransferIntentDto,
    tenantId: string,
    userId: string,
    role: UserRole,
  ) {
    const db = this.prisma.forTenant(tenantId)

    const unit = await db.unit.findFirst({ where: { id: dto.unitId, isActive: true } })
    if (!unit) throw new NotFoundException('Daire bulunamadı')

    if (dto.duesId) {
      const dues = await db.dues.findFirst({
        where: { id: dto.duesId },
        select: { id: true, unitId: true, status: true },
      })
      if (!dues) throw new NotFoundException('Aidat kaydı bulunamadı')
      if (dues.unitId !== dto.unitId) {
        throw new BadRequestException({
          code: 'PAYMENT_DUES_UNIT_MISMATCH',
          message: 'Aidat ve daire eşleşmiyor',
        })
      }

      if (dues.status === DuesStatus.WAIVED || dues.status === DuesStatus.CANCELLED) {
        throw new BadRequestException('Bu aidat için ödeme başlatılamaz')
      }

      const remaining = await this.getDuesRemainingBalanceFromLedger(db, tenantId, dues.id)
      if (remaining <= 0) {
        throw new BadRequestException('Bu aidat tamamen ödenmiş görünüyor')
      }
      if (dto.amount > remaining + 0.001) {
        throw new BadRequestException({
          code: 'PAYMENT_AMOUNT_EXCEEDS_DUES_REMAINING',
          message: 'Ödeme tutarı açık borcu aşamaz',
        })
      }
    } else {
      const unitOutstanding = await this.getUnitOutstandingBalanceFromLedger(db, dto.unitId)
      if (unitOutstanding <= 0) {
        throw new BadRequestException('Bu daire için açık borç bulunmuyor')
      }
      if (dto.amount > unitOutstanding + 0.001) {
        throw new BadRequestException({
          code: 'PAYMENT_AMOUNT_EXCEEDS_UNIT_REMAINING',
          message: 'Ödeme tutarı dairenin açık borcunu aşamaz',
        })
      }
    }

    await this.assertResidentUnitAccess(db, tenantId, dto.unitId, userId, role)

    const payment = await db.payment.create({
      data: {
        tenantId,
        unitId: dto.unitId,
        duesId: dto.duesId,
        amount: dto.amount,
        currency: 'TRY',
        method: PaymentMethod.BANK_TRANSFER,
        channel: dto.channel,
        provider: PaymentProvider.MANUAL,
        status: PaymentStatus.PENDING,
        paidByUserId: userId,
        note: dto.note,
      },
    })

    await db.paymentAttempt.create({
      data: {
        tenantId,
        paymentId: payment.id,
        unitId: dto.unitId,
        duesId: dto.duesId,
        initiatedByUserId: userId,
        amount: dto.amount,
        currency: 'TRY',
        provider: PaymentProvider.MANUAL,
        method: PaymentMethod.BANK_TRANSFER,
        channel: dto.channel,
        status: PaymentAttemptStatus.PENDING,
        conversationId: randomUUID(),
        metadata: {
          payerInfo: dto.payerInfo ?? null,
        },
      },
    })

    return payment
  }

  async confirmManualBankTransfer(
    dto: ConfirmManualBankTransferDto,
    tenantId: string,
    approverUserId: string,
  ) {
    const db = this.prisma.forTenant(tenantId)

    const payment = await db.payment.findFirst({
      where: {
        id: dto.paymentId,
        method: PaymentMethod.BANK_TRANSFER,
      },
    })

    if (!payment) throw new NotFoundException('Bekleyen banka transferi bulunamadı')
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Bu ödeme bekleyen durumda değil')
    }

    if (payment.duesId) {
      const dues = await db.dues.findFirst({
        where: { id: payment.duesId },
        select: { id: true, unitId: true },
      })
      if (!dues || dues.unitId !== payment.unitId) {
        throw new BadRequestException({
          code: 'PAYMENT_DUES_UNIT_MISMATCH',
          message: 'Ödeme kaydı aidat ve daire eşleşmesi bozulmuş durumda',
        })
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (!dto.approve) {
        const failed = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failedAt: new Date(),
            approvedByUserId: approverUserId,
            note: dto.note ?? payment.note,
          },
        })

        await tx.paymentAttempt.updateMany({
          where: { paymentId: payment.id },
          data: {
            status: PaymentAttemptStatus.FAILED,
            processedAt: new Date(),
          },
        })

        await tx.auditLog.create({
          data: {
            tenantId,
            userId: approverUserId,
            action: AUDIT_ACTIONS.PAYMENT_BANK_TRANSFER_REJECTED,
            entity: 'Payment',
            entityId: payment.id,
            changes: {
              note: dto.note,
            },
          },
        })

        return failed
      }

      const confirmed = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CONFIRMED,
          paidAt: payment.paidAt ?? new Date(),
          confirmedAt: new Date(),
          approvedByUserId: approverUserId,
          note: dto.note ?? payment.note,
        },
      })

      await this.ledgerService.createEntry(
        {
          tenantId,
          unitId: confirmed.unitId,
          amount: Number(confirmed.amount) * -1,
          currency: confirmed.currency,
          entryType: LedgerEntryType.PAYMENT,
          referenceType: LedgerReferenceType.PAYMENT,
          referenceId: confirmed.id,
          idempotencyKey: `payment-confirmed-${confirmed.id}`,
          effectiveAt: confirmed.paidAt ?? new Date(),
          createdByUserId: approverUserId,
          note: confirmed.note ?? undefined,
          metadata: {
            method: confirmed.method,
            channel: confirmed.channel,
            provider: confirmed.provider,
          },
        },
        tx as unknown as PrismaService,
      )

      if (confirmed.duesId) {
        await this.refreshDuesStatus(confirmed.duesId, tenantId, tx as unknown as PrismaService)
      }

      await tx.paymentAttempt.updateMany({
        where: { paymentId: confirmed.id },
        data: {
          status: PaymentAttemptStatus.CONFIRMED,
          processedAt: new Date(),
          providerReference: confirmed.receiptNumber ?? confirmed.id,
        },
      })

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: approverUserId,
          action: AUDIT_ACTIONS.PAYMENT_BANK_TRANSFER_CONFIRMED,
          entity: 'Payment',
          entityId: confirmed.id,
          changes: {
            amount: confirmed.amount,
            note: dto.note,
          },
        },
      })

      return confirmed
    })
  }

  async findAll(filter: PaymentFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = {}
    if (filter.duesId) where['duesId'] = filter.duesId
    if (filter.unitId) where['unitId'] = filter.unitId
    if (filter.residentId) where['paidByResidentId'] = filter.residentId
    if (filter.siteId) where['unit'] = { siteId: filter.siteId }
    if (filter.method) where['method'] = filter.method
    if (filter.status) where['status'] = filter.status
    if (filter.provider) where['provider'] = filter.provider
    if (filter.channel) where['channel'] = filter.channel
    if (filter.dateFrom || filter.dateTo) {
      where['paidAt'] = {
        ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
        ...(filter.dateTo ? { lte: filter.dateTo } : {}),
      }
    }
    if (filter.search) {
      where['OR'] = [
        { note: { contains: filter.search, mode: 'insensitive' } },
        { receiptNumber: { contains: filter.search, mode: 'insensitive' } },
        { providerPaymentId: { contains: filter.search, mode: 'insensitive' } },
        { paidByResident: { firstName: { contains: filter.search, mode: 'insensitive' } } },
        { paidByResident: { lastName: { contains: filter.search, mode: 'insensitive' } } },
        { unit: { number: { contains: filter.search, mode: 'insensitive' } } },
        { unit: { site: { name: { contains: filter.search, mode: 'insensitive' } } } },
      ]
    }

    const [data, total, methodSums, statusSums, monthTotal] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          dues: true,
          unit: {
            select: {
              number: true,
              site: { select: { name: true } },
            },
          },
          paidByResident: {
            select: {
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.payment.count({ where }),
      db.payment.groupBy({
        by: ['method'],
        where,
        _sum: { amount: true },
      }),
      db.payment.groupBy({
        by: ['status'],
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      db.payment.aggregate({
        where: {
          ...where,
          status: PaymentStatus.CONFIRMED,
          paidAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
        },
        _sum: { amount: true },
      }),
    ])

    const methodTotals = {
      onlineCard: 0,
      bankTransfer: 0,
      cash: 0,
      pos: 0,
    }

    for (const row of methodSums) {
      const amount = Number(row._sum.amount ?? 0)
      if (row.method === PaymentMethod.ONLINE_CARD) methodTotals.onlineCard = amount
      if (row.method === PaymentMethod.BANK_TRANSFER) methodTotals.bankTransfer = amount
      if (row.method === PaymentMethod.CASH) methodTotals.cash = amount
      if (row.method === PaymentMethod.POS) methodTotals.pos = amount
    }

    return {
      data,
      meta: {
        total,
        page: filter.page,
        limit: filter.limit,
        totalPages: Math.ceil(total / filter.limit),
      },
      summary: {
        monthTotal: Number(monthTotal._sum.amount ?? 0),
        methodTotals,
        statusTotals: statusSums.map((item) => ({
          status: item.status,
          amount: Number(item._sum.amount ?? 0),
          count: item._count._all,
        })),
      },
    }
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const payment = await db.payment.findFirst({
      where: { id },
      include: {
        dues: true,
        unit: { include: { site: true, block: true } },
        paidByResident: true,
        paidByUser: true,
        approvedByUser: true,
        attempts: true,
      },
    })

    if (!payment) throw new NotFoundException('Ödeme kaydı bulunamadı')
    return payment
  }

  async handleIyzicoWebhook(
    payload: Record<string, unknown>,
    signature: string | undefined,
    rawBody: string,
  ) {
    const token = String(payload['token'] ?? '')
    const conversationId = String(payload['conversationId'] ?? '')

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          ...(token ? [{ providerToken: token }] : []),
          ...(conversationId ? [{ conversationId }] : []),
        ],
      },
    })

    if (!payment) {
      return { success: false, message: 'Ödeme eşleşmedi' }
    }

    const eventId =
      String(payload['eventId'] ?? '') ||
      `${payment.id}-${token || 'no-token'}-${String(payload['status'] ?? 'unknown')}`

    const latestAttempt = await this.prisma.paymentAttempt.findFirst({
      where: { paymentId: payment.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    try {
      await this.prisma.paymentProviderEvent.create({
        data: {
          tenantId: payment.tenantId,
          paymentId: payment.id,
          paymentAttemptId: latestAttempt?.id,
          provider: PaymentProvider.IYZICO,
          eventType: String(payload['eventType'] ?? 'webhook'),
          eventId,
          signature,
          payload: payload as Prisma.InputJsonValue,
          processStatus: ProviderEventStatus.PENDING,
        },
      })
    } catch {
      const existingEvent = await this.prisma.paymentProviderEvent.findFirst({
        where: {
          tenantId: payment.tenantId,
          provider: PaymentProvider.IYZICO,
          eventId,
        },
      })

      if (!existingEvent) {
        throw new InternalServerErrorException('Webhook event kaydı oluşturulamadı')
      }

      if (
        existingEvent.processStatus === ProviderEventStatus.PROCESSED ||
        existingEvent.processStatus === ProviderEventStatus.DUPLICATE
      ) {
        return { success: true, duplicate: true }
      }

      await this.prisma.paymentProviderEvent.update({
        where: { id: existingEvent.id },
        data: {
          paymentId: payment.id,
          paymentAttemptId: latestAttempt?.id,
          signature,
          payload: payload as Prisma.InputJsonValue,
          processStatus: ProviderEventStatus.PENDING,
          processedAt: null,
        },
      })
    }

    const signatureValid = await this.iyzico.validateWebhookSignature(
      payment.tenantId,
      rawBody,
      signature,
    )

    if (!signatureValid) {
      await this.prisma.$transaction(async (tx) => {
        await tx.paymentProviderEvent.updateMany({
          where: { tenantId: payment.tenantId, provider: PaymentProvider.IYZICO, eventId },
          data: {
            processStatus: ProviderEventStatus.FAILED,
            processedAt: new Date(),
          },
        })
        await tx.paymentAttempt.updateMany({
          where: { paymentId: payment.id },
          data: {
            status: PaymentAttemptStatus.FAILED,
            processedAt: new Date(),
          },
        })
      })

      return { success: false, message: 'Webhook imzası geçersiz' }
    }

    const result = await this.iyzico.retrieveCheckoutResult(payment.tenantId, token)

    if (result.status !== 'success') {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failedAt: new Date(),
          },
        })
        await tx.paymentProviderEvent.updateMany({
          where: { tenantId: payment.tenantId, provider: PaymentProvider.IYZICO, eventId },
          data: {
            processStatus: ProviderEventStatus.FAILED,
            processedAt: new Date(),
          },
        })
        await tx.paymentAttempt.updateMany({
          where: { paymentId: payment.id },
          data: {
            status: PaymentAttemptStatus.FAILED,
            processedAt: new Date(),
          },
        })
      })

      return { success: false, message: result.errorMessage ?? 'Ödeme doğrulanamadı' }
    }

    if (payment.status === PaymentStatus.CONFIRMED) {
      await this.prisma.paymentProviderEvent.updateMany({
        where: { tenantId: payment.tenantId, provider: PaymentProvider.IYZICO, eventId },
        data: {
          processStatus: ProviderEventStatus.DUPLICATE,
          processedAt: new Date(),
        },
      })
      return { success: true, duplicate: true }
    }

    const confirmedPayment = await this.prisma.$transaction(async (tx) => {
      const confirmed = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CONFIRMED,
          paidAt: new Date(),
          confirmedAt: new Date(),
          providerPaymentId: result.paymentId,
        },
      })

      await this.ledgerService.createEntry(
        {
          tenantId: confirmed.tenantId,
          unitId: confirmed.unitId,
          amount: Number(confirmed.amount) * -1,
          currency: confirmed.currency,
          entryType: LedgerEntryType.PAYMENT,
          referenceType: LedgerReferenceType.PAYMENT,
          referenceId: confirmed.id,
          idempotencyKey: `payment-confirmed-${confirmed.id}`,
          effectiveAt: confirmed.paidAt ?? new Date(),
          note: confirmed.note ?? undefined,
          metadata: {
            providerPaymentId: confirmed.providerPaymentId,
          },
        },
        tx as unknown as PrismaService,
      )

      await tx.paymentAttempt.updateMany({
        where: { paymentId: confirmed.id },
        data: {
          status: PaymentAttemptStatus.CONFIRMED,
          processedAt: new Date(),
          providerReference: result.paymentId,
        },
      })

      await tx.paymentProviderEvent.updateMany({
        where: { tenantId: payment.tenantId, provider: PaymentProvider.IYZICO, eventId },
        data: {
          processStatus: ProviderEventStatus.PROCESSED,
          processedAt: new Date(),
        },
      })

      if (confirmed.duesId) {
        await this.refreshDuesStatus(confirmed.duesId, confirmed.tenantId, tx as unknown as PrismaService)
      }

      return confirmed
    })

    // Notification (fire-and-forget — webhook işlemini bloklamaz)
    void this.notificationService.createForPayment(
      confirmedPayment.tenantId,
      confirmedPayment.id,
      confirmedPayment.unitId,
      toMoneyNumber(confirmedPayment.amount),
    )

    return { success: true }
  }

  async startRefund(paymentId: string, tenantId: string, _userId: string) {
    const db = this.prisma.forTenant(tenantId)
    const payment = await db.payment.findFirst({ where: { id: paymentId } })
    if (!payment) throw new NotFoundException('Ödeme bulunamadı')

    // dev note: Refund orchestration provider API + webhook tamamlama bekliyor | hedef: M2-refund-engine | etki: İade işlemleri manuel operasyonla yönetiliyor. backlog: SKN-326
    throw new BadRequestException('Refund süreci henüz otomatikleştirilmedi')
  }

  private async refreshDuesStatus(duesId: string, tenantId: string, tx?: PrismaService) {
    const db = tx ?? this.prisma

    const dues = await db.dues.findFirst({
      where: { id: duesId, tenantId },
      select: {
        id: true,
        amount: true,
        dueDate: true,
      },
    })

    if (!dues) return

    const remaining = await this.getDuesRemainingBalanceFromLedger(db, tenantId, dues.id)
    const paidAmount = Math.max(0, Number(dues.amount) - remaining)
    const status = calculateDuesStatus(dues.amount, paidAmount, dues.dueDate)

    await db.dues.update({
      where: { id: duesId },
      data: { status },
    })
  }

  private async getUnitOutstandingBalanceFromLedger(
    db: ReturnType<PrismaService['forTenant']>,
    unitId: string,
  ) {
    const balance = await db.ledgerEntry.aggregate({
      where: { unitId },
      _sum: { amount: true },
    })

    return Math.max(0, toMoneyNumber(balance._sum.amount))
  }

  private async getDuesRemainingBalanceFromLedger(
    db: ReturnType<PrismaService['forTenant']> | PrismaService,
    tenantId: string,
    duesId: string,
  ) {
    const [duesEntries, duesLinkedPayments] = await Promise.all([
      db.ledgerEntry.findMany({
        where: {
          tenantId,
          OR: [
            { referenceType: LedgerReferenceType.DUES, referenceId: duesId },
            { referenceType: LedgerReferenceType.WAIVER, referenceId: duesId },
            { referenceType: LedgerReferenceType.ADJUSTMENT, referenceId: duesId },
          ],
        },
        select: { amount: true },
      }),
      db.payment.findMany({
        where: {
          tenantId,
          duesId,
          status: PaymentStatus.CONFIRMED,
        },
        select: { id: true },
      }),
    ])

    const paymentIds = duesLinkedPayments.map((payment) => payment.id)
    const paymentEntries =
      paymentIds.length > 0
        ? await db.ledgerEntry.findMany({
            where: {
              tenantId,
              referenceType: LedgerReferenceType.PAYMENT,
              referenceId: { in: paymentIds },
            },
            select: { amount: true },
          })
        : []

    const duesTotal = duesEntries.reduce((sum, row) => sum + toMoneyNumber(row.amount), 0)
    const paymentTotal = paymentEntries.reduce((sum, row) => sum + toMoneyNumber(row.amount), 0)
    return Math.max(0, duesTotal + paymentTotal)
  }

  private async assertResidentUnitAccess(
    db: ReturnType<PrismaService['forTenant']>,
    tenantId: string,
    unitId: string,
    userId: string,
    role: UserRole,
  ) {
    if (role !== UserRole.RESIDENT) return

    const occupancy = await db.unitOccupancy.findFirst({
      where: {
        tenantId,
        unitId,
        isActive: true,
        resident: {
          userId,
          isActive: true,
        },
      },
      select: { id: true },
    })

    if (!occupancy) {
      throw new ForbiddenException('Bu daire için ödeme işlemi yetkiniz bulunmuyor')
    }
  }
}
