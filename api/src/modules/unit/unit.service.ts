import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateUnitDto, UpdateUnitDto, UnitFilterDto, CreateBlockDto } from '@sakin/shared'
import { DuesStatus, LedgerReferenceType, PaymentStatus } from '@sakin/shared'
import { toMoneyNumber } from '../../common/finance/finance.utils'
import { mapDuesRemainingByLedger } from '../../common/finance/ledger-balance.util'

@Injectable()
export class UnitService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUnitDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const site = await db.site.findFirst({ where: { id: dto.siteId } })
    if (!site) throw new NotFoundException('Site bulunamadı')

    if (dto.blockId) {
      if (!site.hasBlocks) throw new BadRequestException('Bu site blok yapısını desteklemiyor')
      const block = await db.block.findFirst({ where: { id: dto.blockId, siteId: dto.siteId } })
      if (!block) throw new NotFoundException('Blok bulunamadı')
    }

    return db.unit.create({ data: { ...dto, tenantId } })
  }

  async findAll(filter: UnitFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = {}
    if (filter.siteId) where['siteId'] = filter.siteId
    if (filter.blockId) where['blockId'] = filter.blockId
    if (filter.floor !== undefined) where['floor'] = filter.floor
    if (filter.isActive !== undefined) where['isActive'] = filter.isActive
    if (filter.type) where['type'] = filter.type
    if (filter.search) {
      where['OR'] = [
        { number: { contains: filter.search, mode: 'insensitive' } },
        { occupancies: { some: { resident: { firstName: { contains: filter.search, mode: 'insensitive' } } } } },
        { occupancies: { some: { resident: { lastName: { contains: filter.search, mode: 'insensitive' } } } } },
      ]
    }

    const [data, total] = await Promise.all([
      db.unit.findMany({
        where,
        include: {
          site: { select: { name: true, city: true } },
          block: { select: { name: true } },
          occupancies: {
            where: { isActive: true },
            include: {
              resident: { select: { id: true, firstName: true, lastName: true, type: true } },
            },
            orderBy: [{ isPrimaryResponsible: 'desc' }, { createdAt: 'asc' }],
          },
          dues: {
            select: {
              id: true,
              amount: true,
              status: true,
              dueDate: true,
              payments: {
                where: { status: PaymentStatus.CONFIRMED },
                select: { amount: true },
              },
            },
          },
        },
        orderBy: [{ floor: 'asc' }, { number: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.unit.count({ where }),
    ])
    const unitIds = data.map((unit) => unit.id)
    const ledgerRows = unitIds.length
      ? await db.ledgerEntry.groupBy({
          by: ['unitId'],
          where: { unitId: { in: unitIds } },
          _sum: { amount: true },
        })
      : []
    const ledgerMap = new Map<string, number>(
      ledgerRows
        .filter((row): row is typeof row & { unitId: string } => row.unitId !== null)
        .map((row) => [row.unitId, toMoneyNumber(row._sum.amount)]),
    )

    const mapped = data.map((unit) => {
      const financial = unit.dues.reduce(
        (acc, dues) => {
          const amount = Number(dues.amount)
          const paid = dues.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
          const open = Math.max(0, amount - paid)

          acc.totalAmount += amount
          acc.totalPaid += paid
          if (dues.status === DuesStatus.OVERDUE || (open > 0 && dues.dueDate < new Date())) {
            acc.overdueCount += 1
          }
          if (open > 0 && (!acc.nextDueDate || dues.dueDate < acc.nextDueDate)) {
            acc.nextDueDate = dues.dueDate
          }
          return acc
        },
        {
          totalAmount: 0,
          totalPaid: 0,
          openDebt: Math.max(0, ledgerMap.get(unit.id) ?? 0),
          overdueCount: 0,
          nextDueDate: null as Date | null,
        },
      )

      return {
        ...unit,
        residents: unit.occupancies.map((occupancy) => occupancy.resident),
        financial: {
          ...financial,
          status:
            financial.overdueCount > 0
              ? 'OVERDUE'
              : financial.openDebt > 0
                ? 'DEBTOR'
                : 'CLEAR',
        },
      }
    })

    const filtered = mapped.filter((unit) => {
      if (!filter.financialStatus) return true
      return unit.financial.status === filter.financialStatus
    })

    return {
      data: filtered,
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
    const unit = await db.unit.findFirst({
      where: { id },
      include: {
        site: true,
        block: true,
        occupancies: {
          include: {
            resident: true,
          },
          orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }],
        },
        dues: {
          include: {
            payments: {
              where: { status: PaymentStatus.CONFIRMED },
              orderBy: { paidAt: 'desc' },
              take: 5,
            },
          },
          orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
          take: 12,
        },
      },
    })
    if (!unit) throw new NotFoundException('Daire bulunamadı')

    const [unitLedger, dueLedgerRemainingMap] = await Promise.all([
      db.ledgerEntry.aggregate({
        where: { unitId: id },
        _sum: { amount: true },
      }),
      mapDuesRemainingByLedger(
        db,
        tenantId,
        unit.dues.map((dues) => dues.id),
      ),
    ])

    return {
      ...unit,
      residents: unit.occupancies.map((occupancy) => occupancy.resident),
      unitLedgerBalance: Math.max(0, toMoneyNumber(unitLedger._sum.amount)),
      dues: unit.dues.map((dues) => {
        const paidAmount = dues.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
        const remainingFromLedger = dueLedgerRemainingMap.get(dues.id)
        return {
          ...dues,
          paidAmount,
          remainingAmount: Math.max(
            0,
            remainingFromLedger ?? Number(dues.amount) - paidAmount,
          ),
        }
      }),
    }
  }

  async update(id: string, dto: UpdateUnitDto, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.unit.update({ where: { id }, data: dto })
  }

  async softDelete(id: string, tenantId: string) {
    await this.findOne(id, tenantId)

    const db = this.prisma.forTenant(tenantId)
    const openDues = await db.dues.count({
      where: {
        unitId: id,
        status: { in: [DuesStatus.PENDING, DuesStatus.OVERDUE, DuesStatus.PARTIALLY_PAID] },
      },
    })
    if (openDues > 0) {
      throw new ConflictException(`Bu dairenin ${openDues} adet açık aidatı var. Silmeden önce kapatın.`)
    }

    return db.unit.update({ where: { id }, data: { isActive: false } })
  }

  async activate(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.unit.update({ where: { id }, data: { isActive: true } })
  }

  async createBlock(siteId: string, dto: CreateBlockDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const site = await db.site.findFirst({ where: { id: siteId } })
    if (!site) throw new NotFoundException('Site bulunamadı')
    if (!site.hasBlocks) throw new BadRequestException('Bu site blok yapısını desteklemiyor')

    const existing = await db.block.findFirst({ where: { siteId, name: dto.name } })
    if (existing) throw new ConflictException(`'${dto.name}' adlı blok zaten mevcut`)

    return db.block.create({ data: { ...dto, siteId, tenantId } })
  }

  async findBlocks(siteId: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const site = await db.site.findFirst({ where: { id: siteId } })
    if (!site) throw new NotFoundException('Site bulunamadı')

    return db.block.findMany({
      where: { siteId },
      include: { _count: { select: { units: true } } },
      orderBy: { name: 'asc' },
    })
  }

}
