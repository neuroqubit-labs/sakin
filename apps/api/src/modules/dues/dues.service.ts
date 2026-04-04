import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { GenerateDuesDto, DuesFilterDto, UpdateDuesDto } from '@sakin/shared'
import { DuesStatus } from '@sakin/shared'

@Injectable()
export class DuesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Belirtilen site için tüm aktif dairelere toplu aidat oluşturur.
   * @@unique([unitId, periodMonth, periodYear]) kısıtı sayesinde idempotent çalışır.
   */
  async generate(dto: GenerateDuesDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const units = await db.unit.findMany({
      where: { siteId: dto.siteId, isActive: true },
      select: { id: true },
    })

    if (units.length === 0) {
      throw new NotFoundException('Bu siteye ait aktif daire bulunamadı')
    }

    const dueDate = new Date(dto.periodYear, dto.periodMonth - 1, dto.dueDayOfMonth)

    const result = await this.prisma.dues.createMany({
      data: units.map((unit) => ({
        tenantId,
        unitId: unit.id,
        amount: dto.amount,
        paidAmount: 0,
        status: DuesStatus.PENDING,
        dueDate,
        periodMonth: dto.periodMonth,
        periodYear: dto.periodYear,
        description: dto.description,
      })),
      skipDuplicates: true, // aynı dönem için tekrar çalıştırılabilir
    })

    return {
      created: result.count,
      total: units.length,
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

    const [data, total] = await Promise.all([
      db.dues.findMany({
        where,
        include: {
          unit: { select: { number: true, floor: true, site: { select: { name: true } } } },
        },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.dues.count({ where }),
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

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const dues = await db.dues.findFirst({
      where: { id },
      include: {
        unit: { include: { site: true } },
        payments: true,
      },
    })

    if (!dues) throw new NotFoundException('Aidat kaydı bulunamadı')
    return dues
  }

  async update(id: string, dto: UpdateDuesDto, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.dues.update({ where: { id }, data: dto })
  }

  /**
   * Vadesi geçmiş aidatları OVERDUE olarak işaretle.
   * Cron job veya manuel tetikleyici ile çağrılabilir.
   */
  async markOverdue(tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const result = await db.dues.updateMany({
      where: {
        status: DuesStatus.PENDING,
        dueDate: { lt: new Date() },
      },
      data: { status: DuesStatus.OVERDUE },
    })
    return { updated: result.count }
  }
}
