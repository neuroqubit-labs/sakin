import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type {
  CloseDuesPeriodDto,
  CreateDuesPolicyDto,
  DuesFilterDto,
  DuesPolicyFilterDto,
  GenerateDuesDto,
  OpenDuesPeriodDto,
  UpdateDuesPolicyDto,
  UpdateDuesDto,
  WaiveDuesDto,
} from '@sakin/shared'
import { DuesStatus, DuesType, LedgerEntryType, LedgerReferenceType, PaymentStatus } from '@sakin/shared'
import { LedgerService } from '../ledger/ledger.service'
import { calculateDuesStatus, toMoneyNumber } from '../../common/finance/finance.utils'
import { mapDuesRemainingByLedger } from '../../common/finance/ledger-balance.util'

@Injectable()
export class DuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * Site içindeki aktif daireler için dönemsel aidat üretir.
   * Her yeni aidat kaydı için immutable ledger CHARGE hareketi yazar.
   */
  async generate(dto: GenerateDuesDto, tenantId: string, userId: string) {
    const db = this.prisma.forTenant(tenantId)

    const units = await db.unit.findMany({
      where: { siteId: dto.siteId, isActive: true },
      select: { id: true },
    })

    if (units.length === 0) {
      throw new NotFoundException('Bu siteye ait aktif daire bulunamadı')
    }

    const dueDate = new Date(dto.periodYear, dto.periodMonth - 1, dto.dueDayOfMonth)
    let created = 0

    for (const unit of units) {
      // eslint-disable-next-line no-await-in-loop
      const existing = await db.dues.findFirst({
        where: {
          unitId: unit.id,
          periodMonth: dto.periodMonth,
          periodYear: dto.periodYear,
        },
        select: { id: true },
      })

      if (existing) continue

      // eslint-disable-next-line no-await-in-loop
      await this.prisma.$transaction(async (tx) => {
        const dues = await tx.dues.create({
          data: {
            tenantId,
            unitId: unit.id,
            duesDefinitionId: dto.duesDefinitionId,
            amount: dto.amount,
            currency: dto.currency,
            dueDate,
            periodMonth: dto.periodMonth,
            periodYear: dto.periodYear,
            description: dto.description,
            status: DuesStatus.PENDING,
          },
        })

        await this.ledgerService.createEntry(
          {
            tenantId,
            unitId: unit.id,
            amount: dto.amount,
            currency: dto.currency,
            entryType: LedgerEntryType.CHARGE,
            referenceType: LedgerReferenceType.DUES,
            referenceId: dues.id,
            idempotencyKey: `dues-charge-${dues.id}`,
            effectiveAt: dues.dueDate,
            createdByUserId: userId,
            note: dues.description ?? `${dto.periodMonth}/${dto.periodYear} aidat tahakkuku`,
            metadata: {
              periodMonth: dto.periodMonth,
              periodYear: dto.periodYear,
              duesDefinitionId: dto.duesDefinitionId ?? null,
            },
          },
          tx as unknown as PrismaService,
        )
      })

      created += 1
    }

    return {
      created,
      total: units.length,
      skipped: units.length - created,
      period: `${dto.periodMonth}/${dto.periodYear}`,
    }
  }

  async findAll(filter: DuesFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = {}
    if (filter.siteId) where['unit'] = { siteId: filter.siteId }
    if (filter.unitId) where['unitId'] = filter.unitId
    if (filter.periodMonth) where['periodMonth'] = filter.periodMonth
    if (filter.periodYear) where['periodYear'] = filter.periodYear
    if (filter.status) where['status'] = filter.status
    if (filter.dateFrom || filter.dateTo) {
      where['dueDate'] = {
        ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
        ...(filter.dateTo ? { lte: filter.dateTo } : {}),
      }
    }
    if (filter.search) {
      where['OR'] = [
        { description: { contains: filter.search, mode: 'insensitive' } },
        { unit: { number: { contains: filter.search, mode: 'insensitive' } } },
        { unit: { site: { name: { contains: filter.search, mode: 'insensitive' } } } },
      ]
    }

    const [rows, total] = await Promise.all([
      db.dues.findMany({
        where,
        include: {
          unit: {
            select: {
              id: true,
              number: true,
              floor: true,
              site: { select: { name: true } },
            },
          },
        },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { dueDate: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.dues.count({ where }),
    ])

    const duesIds = rows.map((row) => row.id)
    const paidRows = duesIds.length
      ? await db.payment.groupBy({
          by: ['duesId'],
          where: {
            duesId: { in: duesIds },
            status: PaymentStatus.CONFIRMED,
          },
          _sum: { amount: true },
        })
      : []

    const paidMap = new Map<string, number>()
    paidRows.forEach((row) => {
      if (row.duesId) {
        paidMap.set(row.duesId, Number(row._sum.amount ?? 0))
      }
    })
    const ledgerRemainingMap = await mapDuesRemainingByLedger(db, tenantId, duesIds)

    const data = rows.map((dues) => {
      const paidAmount = paidMap.get(dues.id) ?? 0
      const remainingFromLedger = ledgerRemainingMap.get(dues.id)
      const remainingAmount = Math.max(
        0,
        remainingFromLedger ?? Number(dues.amount) - paidAmount,
      )
      return {
        ...dues,
        paidAmount,
        remainingAmount,
      }
    })

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

  async listPolicies(filter: DuesPolicyFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const where: Record<string, unknown> = {}
    if (filter.siteId) where['siteId'] = filter.siteId
    if (filter.isActive !== undefined) where['isActive'] = filter.isActive

    const [data, total] = await Promise.all([
      db.duesDefinition.findMany({
        where,
        include: {
          site: {
            select: { id: true, name: true, city: true },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.duesDefinition.count({ where }),
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

  async createPolicy(dto: CreateDuesPolicyDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    return db.duesDefinition.create({
      data: {
        tenantId,
        siteId: dto.siteId,
        name: dto.name,
        amount: dto.amount,
        currency: dto.currency,
        type: dto.type,
        dueDay: dto.dueDay,
        isActive: dto.isActive,
        description: dto.description,
      },
    })
  }

  async updatePolicy(id: string, dto: UpdateDuesPolicyDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const existing = await db.duesDefinition.findFirst({ where: { id } })
    if (!existing) throw new NotFoundException('Aidat policy bulunamadi')

    return db.duesDefinition.update({
      where: { id },
      data: {
        siteId: dto.siteId,
        name: dto.name,
        amount: dto.amount,
        currency: dto.currency,
        type: dto.type,
        dueDay: dto.dueDay,
        isActive: dto.isActive,
        description: dto.description,
      },
    })
  }

  async openPeriod(dto: OpenDuesPeriodDto, tenantId: string, userId: string) {
    const db = this.prisma.forTenant(tenantId)
    const policy = await db.duesDefinition.findFirst({
      where: { id: dto.policyId, siteId: dto.siteId },
    })
    if (!policy) throw new NotFoundException('Donem acilisi icin policy bulunamadi')
    if (!policy.isActive) {
      throw new BadRequestException('Pasif policy ile donem acilamaz')
    }

    return this.generate(
      {
        siteId: dto.siteId,
        duesDefinitionId: policy.id,
        periodMonth: dto.periodMonth,
        periodYear: dto.periodYear,
        amount: Number(policy.amount),
        currency: policy.currency,
        type: policy.type as DuesType,
        dueDayOfMonth: policy.dueDay,
        description: dto.description ?? policy.description ?? `${dto.periodMonth}/${dto.periodYear} donem aidati`,
      },
      tenantId,
      userId,
    )
  }

  async closePeriod(dto: CloseDuesPeriodDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    if (!dto.forceOverdue) {
      return { updated: 0, period: `${dto.periodMonth}/${dto.periodYear}` }
    }

    const result = await db.dues.updateMany({
      where: {
        periodMonth: dto.periodMonth,
        periodYear: dto.periodYear,
        unit: { siteId: dto.siteId },
        status: { in: [DuesStatus.PENDING, DuesStatus.PARTIALLY_PAID] },
      },
      data: { status: DuesStatus.OVERDUE },
    })

    return { updated: result.count, period: `${dto.periodMonth}/${dto.periodYear}` }
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const dues = await db.dues.findFirst({
      where: { id },
      include: {
        unit: { include: { site: true, block: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!dues) throw new NotFoundException('Aidat kaydı bulunamadı')

    const paidAmount = dues.payments
      .filter((payment) => payment.status === PaymentStatus.CONFIRMED)
      .reduce((sum, payment) => sum + Number(payment.amount), 0)
    const ledgerRemainingMap = await mapDuesRemainingByLedger(db, tenantId, [dues.id])
    const remainingFromLedger = ledgerRemainingMap.get(dues.id)

    return {
      ...dues,
      paidAmount,
      remainingAmount: Math.max(0, remainingFromLedger ?? Number(dues.amount) - paidAmount),
    }
  }

  async update(id: string, dto: UpdateDuesDto, tenantId: string, userId: string) {
    const db = this.prisma.forTenant(tenantId)
    const existing = await db.dues.findFirst({ where: { id } })
    if (!existing) throw new NotFoundException('Aidat kaydı bulunamadı')

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dues.update({
        where: { id },
        data: {
          amount: dto.amount,
          currency: dto.currency,
          dueDate: dto.dueDate,
          description: dto.description,
        },
      })

      if (dto.amount !== undefined && Number(dto.amount) !== Number(existing.amount)) {
        const diff = Number(dto.amount) - Number(existing.amount)
        await this.ledgerService.createEntry(
          {
            tenantId,
            unitId: existing.unitId,
            amount: diff,
            currency: dto.currency ?? existing.currency,
            entryType: LedgerEntryType.ADJUSTMENT,
            referenceType: LedgerReferenceType.DUES,
            referenceId: id,
            idempotencyKey: `dues-adjust-${id}-${updated.updatedAt.getTime()}`,
            createdByUserId: userId,
            note: 'Aidat tutar güncellemesi',
            metadata: {
              previousAmount: Number(existing.amount),
              newAmount: Number(dto.amount),
            },
          },
          tx as unknown as PrismaService,
        )
      }

      const ledgerRemainingMap = await mapDuesRemainingByLedger(tx as unknown as PrismaService, tenantId, [id])
      const remaining = Math.max(0, ledgerRemainingMap.get(id) ?? Number(dto.amount ?? existing.amount))
      const paidAmount = Math.max(0, Number(dto.amount ?? existing.amount) - remaining)
      const nextStatus = calculateDuesStatus(
        dto.amount ?? existing.amount,
        paidAmount,
        dto.dueDate ?? existing.dueDate,
      )

      await tx.dues.update({
        where: { id },
        data: { status: nextStatus },
      })

      return { ...updated, status: nextStatus }
    })
  }

  async waive(id: string, dto: WaiveDuesDto, tenantId: string, userId: string) {
    const db = this.prisma.forTenant(tenantId)

    const dues = await db.dues.findFirst({
      where: { id },
      select: {
        id: true,
        unitId: true,
        amount: true,
        currency: true,
        status: true,
        description: true,
      },
    })

    if (!dues) throw new NotFoundException('Aidat kaydı bulunamadı')
    if (dues.status === DuesStatus.WAIVED) {
      throw new BadRequestException('Aidat zaten silinmiş (WAIVED) durumda')
    }

    const remainingMap = await mapDuesRemainingByLedger(db, tenantId, [dues.id])
    const remaining = Math.max(0, remainingMap.get(dues.id) ?? Number(dues.amount))

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dues.update({
        where: { id },
        data: {
          status: DuesStatus.WAIVED,
          description: dues.description
            ? `${dues.description} | WAIVED: ${dto.reason ?? 'manuel silme'}`
            : `WAIVED: ${dto.reason ?? 'manuel silme'}`,
        },
      })

      if (remaining > 0) {
        await this.ledgerService.createEntry(
          {
            tenantId,
            unitId: dues.unitId,
            amount: remaining * -1,
            currency: dues.currency,
            entryType: LedgerEntryType.WAIVER,
            referenceType: LedgerReferenceType.WAIVER,
            referenceId: dues.id,
            idempotencyKey: `dues-waiver-${dues.id}`,
            createdByUserId: userId,
            note: dto.reason ?? 'Aidat silme işlemi',
          },
          tx as unknown as PrismaService,
        )
      }

      return updated
    })
  }

  /**
   * Vadesi geçmiş aidatları OVERDUE olarak işaretler.
   */
  async markOverdue(tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const result = await db.dues.updateMany({
      where: {
        status: { in: [DuesStatus.PENDING, DuesStatus.PARTIALLY_PAID] },
        dueDate: { lt: new Date() },
      },
      data: { status: DuesStatus.OVERDUE },
    })
    return { updated: result.count }
  }

}
