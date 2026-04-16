import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { DuesType, LedgerEntryType, LedgerReferenceType } from '@sakin/shared'
import type { CreateExpenseDto, UpdateExpenseDto, ExpenseFilterDto, DistributeExpenseDto } from '@sakin/shared'
import { LedgerService } from '../ledger/ledger.service'
import { DuesService } from '../dues/dues.service'

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly duesService: DuesService,
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

  /**
   * Gider kaydı oluşturur ve dairelere borç olarak dağıtır.
   */
  async createWithDistribution(dto: DistributeExpenseDto, tenantId: string, userId: string) {
    const db = this.prisma.forTenant(tenantId)

    const site = await db.site.findFirst({ where: { id: dto.siteId } })
    if (!site) throw new NotFoundException('Site bulunamadı')

    const units = await db.unit.findMany({
      where: { siteId: dto.siteId, isActive: true },
      select: { id: true, area: true },
    })

    if (units.length === 0) {
      throw new BadRequestException('Bu siteye ait aktif daire bulunamadı')
    }

    // 1. Gider kaydı oluştur
    const expense = await this.create(
      {
        siteId: dto.siteId,
        amount: dto.amount,
        category: dto.category,
        description: dto.description,
        date: dto.date,
        receiptUrl: dto.receiptUrl,
      },
      tenantId,
      userId,
    )

    // 2. Dağıtım hesapla
    let perUnitAmounts: Map<string, number>

    if (dto.distributionMethod === 'AREA_BASED') {
      const totalArea = units.reduce((sum, u) => sum + (u.area ? Number(u.area) : 0), 0)
      if (totalArea <= 0) {
        // m² bilgisi yoksa eşit bölmeye fallback
        const perUnit = Math.round((dto.amount / units.length) * 100) / 100
        perUnitAmounts = new Map(units.map((u) => [u.id, perUnit]))
      } else {
        perUnitAmounts = new Map(
          units.map((u) => {
            const area = u.area ? Number(u.area) : 0
            const share = area > 0
              ? Math.round(((area / totalArea) * dto.amount) * 100) / 100
              : Math.round((dto.amount / units.length) * 100) / 100
            return [u.id, share]
          }),
        )
      }
    } else {
      const perUnit = Math.round((dto.amount / units.length) * 100) / 100
      perUnitAmounts = new Map(units.map((u) => [u.id, perUnit]))
    }

    // 3. Her daire için borç oluştur
    const dueDate = dto.dueDate
    const periodMonth = dueDate.getMonth() + 1
    const periodYear = dueDate.getFullYear()
    let created = 0

    for (const unit of units) {
      const unitAmount = perUnitAmounts.get(unit.id) ?? 0
      if (unitAmount <= 0) continue

      // eslint-disable-next-line no-await-in-loop
      const existing = await db.dues.findFirst({
        where: {
          unitId: unit.id,
          periodMonth,
          periodYear,
          description: { contains: dto.description },
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
            amount: unitAmount,
            currency: 'TRY',
            dueDate,
            periodMonth,
            periodYear,
            description: `${dto.description} (gider dağıtımı)`,
            status: 'PENDING',
          },
        })

        await this.ledgerService.createEntry(
          {
            tenantId,
            unitId: unit.id,
            amount: unitAmount,
            currency: 'TRY',
            entryType: LedgerEntryType.CHARGE,
            referenceType: LedgerReferenceType.DUES,
            referenceId: dues.id,
            idempotencyKey: `expense-dist-${expense.id}-${unit.id}`,
            effectiveAt: dueDate,
            createdByUserId: userId,
            note: dto.description,
            metadata: {
              expenseId: expense.id,
              distributionMethod: dto.distributionMethod,
            },
          },
          tx as unknown as PrismaService,
        )
      })
      created += 1
    }

    return {
      expense,
      distribution: { created, total: units.length, skipped: units.length - created },
    }
  }
}
