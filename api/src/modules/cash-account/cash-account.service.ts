import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CashTransactionType, CashReferenceType } from '@sakin/shared'
import type {
  CreateCashAccountDto,
  UpdateCashAccountDto,
  CashAccountFilterDto,
  CreateCashTransactionDto,
  CashTransactionFilterDto,
} from '@sakin/shared'

@Injectable()
export class CashAccountService {
  private readonly logger = new Logger(CashAccountService.name)
  constructor(private readonly prisma: PrismaService) {}

  async recordPaymentInflow(
    params: {
      tenantId: string
      siteId: string
      paymentId: string
      amount: number
      paidAt: Date
      description: string
      userId?: string
      cashAccountId?: string
    },
    tx?: PrismaService,
  ): Promise<void> {
    const db = (tx ?? this.prisma.forTenant(params.tenantId)) as unknown as PrismaService

    const existing = await db.cashTransaction.findFirst({
      where: { referenceType: CashReferenceType.PAYMENT, referenceId: params.paymentId },
    })
    if (existing) return

    let account = null
    if (params.cashAccountId) {
      account = await db.cashAccount.findFirst({
        where: { id: params.cashAccountId, siteId: params.siteId, isActive: true },
      })
    }
    if (!account) {
      account = await db.cashAccount.findFirst({
        where: { siteId: params.siteId, isActive: true },
        orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
      })
    }
    if (!account) {
      this.logger.warn(
        `Payment ${params.paymentId} confirmed but no cash account found for site ${params.siteId}`,
      )
      return
    }

    let createdById = params.userId
    if (!createdById) {
      const adminRole = await db.userTenantRole.findFirst({
        where: { tenantId: params.tenantId, role: 'TENANT_ADMIN', isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { userId: true },
      })
      if (!adminRole) {
        this.logger.warn(
          `Payment ${params.paymentId}: no creator user available, skipping cash transaction`,
        )
        return
      }
      createdById = adminRole.userId
    }

    await db.cashTransaction.create({
      data: {
        tenantId: params.tenantId,
        cashAccountId: account.id,
        amount: params.amount,
        type: CashTransactionType.INCOME,
        referenceType: CashReferenceType.PAYMENT,
        referenceId: params.paymentId,
        description: params.description,
        transactionDate: params.paidAt,
        createdById,
      },
    })
  }

  async create(dto: CreateCashAccountDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const site = await db.site.findFirst({ where: { id: dto.siteId } })
    if (!site) throw new NotFoundException('Site bulunamadı')

    const existing = await db.cashAccount.findFirst({
      where: { siteId: dto.siteId, name: dto.name },
    })
    if (existing) throw new ConflictException('Bu isimde bir hesap zaten mevcut')

    return db.cashAccount.create({
      data: { ...dto, tenantId },
      include: { site: { select: { name: true } } },
    })
  }

  async findAll(filter: CashAccountFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = {}
    if (filter.siteId) where['siteId'] = filter.siteId
    if (filter.type) where['type'] = filter.type
    if (filter.isActive !== undefined) where['isActive'] = filter.isActive

    const [accounts, total] = await Promise.all([
      db.cashAccount.findMany({
        where,
        include: { site: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.cashAccount.count({ where }),
    ])

    const data = await Promise.all(
      accounts.map(async (account) => ({
        ...account,
        balance: await this.getBalance(account.id, tenantId),
      })),
    )

    return {
      data,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const account = await db.cashAccount.findFirst({
      where: { id },
      include: { site: { select: { name: true } } },
    })
    if (!account) throw new NotFoundException('Kasa/banka hesabı bulunamadı')
    const balance = await this.getBalance(id, tenantId)
    return { ...account, balance }
  }

  async update(id: string, dto: UpdateCashAccountDto, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.cashAccount.update({
      where: { id },
      data: dto,
      include: { site: { select: { name: true } } },
    })
  }

  async createTransaction(
    cashAccountId: string,
    dto: CreateCashTransactionDto,
    tenantId: string,
    userId: string,
  ) {
    await this.findOne(cashAccountId, tenantId)
    const db = this.prisma.forTenant(tenantId)

    return db.cashTransaction.create({
      data: {
        tenantId,
        cashAccountId,
        amount: dto.amount,
        type: dto.type,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        description: dto.description,
        transactionDate: dto.transactionDate,
        createdById: userId,
      },
    })
  }

  async getBalance(cashAccountId: string, tenantId: string): Promise<number> {
    const db = this.prisma.forTenant(tenantId)
    const result = await db.cashTransaction.aggregate({
      where: { cashAccountId },
      _sum: { amount: true },
    })
    // EXPENSE transactions are stored as positive amounts but represent outflows
    // To get correct balance, we need to sum by type
    const transactions = await db.cashTransaction.groupBy({
      by: ['type'],
      where: { cashAccountId },
      _sum: { amount: true },
    })
    let balance = 0
    for (const row of transactions) {
      const amount = Number(row._sum.amount ?? 0)
      balance += row.type === 'EXPENSE' ? -amount : amount
    }
    return balance
  }

  async findTransactions(
    cashAccountId: string,
    filter: CashTransactionFilterDto,
    tenantId: string,
  ) {
    await this.findOne(cashAccountId, tenantId)
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = { cashAccountId }
    if (filter.type) where['type'] = filter.type
    if (filter.dateFrom || filter.dateTo) {
      where['transactionDate'] = {
        ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
        ...(filter.dateTo ? { lte: filter.dateTo } : {}),
      }
    }

    const [data, total] = await Promise.all([
      db.cashTransaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.cashTransaction.count({ where }),
    ])

    return {
      data,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }
}
