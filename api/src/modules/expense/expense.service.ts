import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { LedgerEntryType, LedgerReferenceType } from '@sakin/shared'
import type { CreateExpenseDto, UpdateExpenseDto, ExpenseFilterDto } from '@sakin/shared'
import { LedgerService } from '../ledger/ledger.service'

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  async create(dto: CreateExpenseDto, tenantId: string, userId: string) {
    const db = this.prisma.forTenant(tenantId)

    const site = await db.site.findFirst({ where: { id: dto.siteId } })
    if (!site) throw new NotFoundException('Site bulunamadı')

    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: { ...dto, tenantId, createdById: userId },
        include: { site: { select: { name: true } } },
      })

      await this.ledgerService.createEntry(
        {
          tenantId,
          siteId: dto.siteId,
          amount: -Number(dto.amount),
          currency: 'TRY',
          entryType: LedgerEntryType.EXPENSE,
          referenceType: LedgerReferenceType.EXPENSE,
          referenceId: expense.id,
          idempotencyKey: `expense-${expense.id}`,
          effectiveAt: new Date(dto.date),
          createdByUserId: userId,
          note: dto.description,
        },
        tx as unknown as PrismaService,
      )

      return expense
    })
  }

  async findAll(filter: ExpenseFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = { deletedAt: null }
    if (filter.siteId) where['siteId'] = filter.siteId
    if (filter.category) where['category'] = filter.category
    if (filter.dateFrom || filter.dateTo) {
      where['date'] = {
        ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
        ...(filter.dateTo ? { lte: filter.dateTo } : {}),
      }
    }

    const [data, total] = await Promise.all([
      db.expense.findMany({
        where,
        include: { site: { select: { name: true } } },
        orderBy: { date: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.expense.count({ where }),
    ])

    return {
      data,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const expense = await db.expense.findFirst({
      where: { id, deletedAt: null },
      include: { site: true },
    })
    if (!expense) throw new NotFoundException('Gider kaydı bulunamadı')
    return expense
  }

  async update(id: string, dto: UpdateExpenseDto, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.expense.update({ where: { id }, data: dto })
  }

  async delete(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.expense.update({ where: { id }, data: { deletedAt: new Date() } })
  }
}
