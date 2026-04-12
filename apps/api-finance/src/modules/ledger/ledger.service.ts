import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import type { Prisma } from '@sakin/database'
import { PrismaService } from '../../prisma/prisma.service'
import {
  LedgerEntryType,
  LedgerReferenceType,
  UserRole,
  type LedgerFilterDto,
  type UnitStatementDto,
} from '@sakin/shared'

interface CreateLedgerEntryInput {
  tenantId: string
  unitId: string
  amount: number
  currency?: string
  entryType: LedgerEntryType
  referenceType: LedgerReferenceType
  referenceId: string
  idempotencyKey?: string
  effectiveAt?: Date
  createdByUserId?: string
  note?: string
  metadata?: Record<string, unknown>
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async createEntry(input: CreateLedgerEntryInput, tx?: PrismaService) {
    const db = tx ?? this.prisma

    const unit = await db.unit.findFirst({
      where: { id: input.unitId, tenantId: input.tenantId },
      select: { id: true },
    })
    if (!unit) {
      throw new BadRequestException('Ledger unit/tenant eşleşmesi doğrulanamadı')
    }

    if (
      input.referenceType === LedgerReferenceType.DUES ||
      input.referenceType === LedgerReferenceType.WAIVER ||
      input.referenceType === LedgerReferenceType.ADJUSTMENT
    ) {
      const dues = await db.dues.findFirst({
        where: {
          id: input.referenceId,
          tenantId: input.tenantId,
          unitId: input.unitId,
        },
        select: { id: true },
      })
      if (!dues) {
        throw new BadRequestException('Ledger dues referansı tenant/unit ile uyumsuz')
      }
    }

    if (
      input.referenceType === LedgerReferenceType.PAYMENT ||
      input.referenceType === LedgerReferenceType.REFUND
    ) {
      const payment = await db.payment.findFirst({
        where: {
          id: input.referenceId,
          tenantId: input.tenantId,
          unitId: input.unitId,
        },
        select: { id: true },
      })
      if (!payment) {
        throw new BadRequestException('Ledger payment referansı tenant/unit ile uyumsuz')
      }
    }

    return db.ledgerEntry.create({
      data: {
        tenantId: input.tenantId,
        unitId: input.unitId,
        amount: input.amount,
        currency: input.currency ?? 'TRY',
        entryType: input.entryType,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        idempotencyKey: input.idempotencyKey,
        effectiveAt: input.effectiveAt ?? new Date(),
        createdByUserId: input.createdByUserId,
        note: input.note,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    })
  }

  async getUnitStatement(
    dto: UnitStatementDto,
    tenantId: string,
    requester: { userId: string; role: UserRole },
  ) {
    const db = this.prisma.forTenant(tenantId)
    await this.assertResidentUnitAccess(db, tenantId, dto.unitId, requester.userId, requester.role)

    const where: Record<string, unknown> = {
      unitId: dto.unitId,
      ...(dto.dateFrom || dto.dateTo
        ? {
            effectiveAt: {
              ...(dto.dateFrom ? { gte: dto.dateFrom } : {}),
              ...(dto.dateTo ? { lte: dto.dateTo } : {}),
            },
          }
        : {}),
    }

    const [entries, unit] = await Promise.all([
      db.ledgerEntry.findMany({
        where,
        orderBy: [{ effectiveAt: 'asc' }, { createdAt: 'asc' }],
      }),
      db.unit.findFirst({ where: { id: dto.unitId }, include: { site: true, block: true } }),
    ])

    const balance = entries.reduce((acc, item) => acc + Number(item.amount), 0)

    return {
      unit,
      balance,
      entries,
    }
  }

  async list(filter: LedgerFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = {}
    if (filter.unitId) where['unitId'] = filter.unitId
    if (filter.siteId) where['unit'] = { siteId: filter.siteId }
    if (filter.entryType) where['entryType'] = filter.entryType
    if (filter.periodMonth || filter.periodYear) {
      const year = filter.periodYear ?? new Date().getFullYear()
      const month = filter.periodMonth ? filter.periodMonth - 1 : 0
      const start = new Date(year, month, 1)
      const end = filter.periodMonth
        ? new Date(year, month + 1, 1)
        : new Date(year + 1, 0, 1)
      where['effectiveAt'] = {
        ...(where['effectiveAt'] as Record<string, unknown>),
        gte: start,
        lt: end,
      }
    }
    if (filter.dateFrom || filter.dateTo) {
      where['effectiveAt'] = {
        ...(where['effectiveAt'] as Record<string, unknown>),
        ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
        ...(filter.dateTo ? { lte: filter.dateTo } : {}),
      }
    }

    const [data, total] = await Promise.all([
      db.ledgerEntry.findMany({
        where,
        include: {
          unit: {
            select: {
              number: true,
              site: { select: { name: true } },
            },
          },
        },
        orderBy: [{ effectiveAt: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.ledgerEntry.count({ where }),
    ])

    const net = data.reduce((sum, row) => sum + Number(row.amount), 0)

    return {
      data,
      meta: {
        total,
        page: filter.page,
        limit: filter.limit,
        totalPages: Math.ceil(total / filter.limit),
      },
      summary: {
        net,
      },
    }
  }

  async getTenantCollectionSummary(tenantId: string, siteId?: string) {
    const db = this.prisma.forTenant(tenantId)
    const where: Record<string, unknown> = {
      entryType: { in: [LedgerEntryType.PAYMENT, LedgerEntryType.REFUND] },
      ...(siteId ? { unit: { siteId } } : {}),
    }

    const [monthAggregate, totalAggregate] = await Promise.all([
      db.ledgerEntry.aggregate({
        where: {
          ...where,
          effectiveAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
        },
        _sum: { amount: true },
      }),
      db.ledgerEntry.aggregate({
        where,
        _sum: { amount: true },
      }),
    ])

    return {
      monthCollection: Math.abs(Number(monthAggregate._sum.amount ?? 0)),
      totalCollection: Math.abs(Number(totalAggregate._sum.amount ?? 0)),
    }
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
      throw new ForbiddenException('Bu daire ekstresine erişim yetkiniz bulunmuyor')
    }
  }
}
