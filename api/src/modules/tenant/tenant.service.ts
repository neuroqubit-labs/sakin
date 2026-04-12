import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { UpdateTenantDto, UpsertTenantGatewayConfigDto } from '@sakin/shared'
import { DuesStatus, LedgerEntryType, LedgerReferenceType, PaymentStatus } from '@sakin/shared'
import { normalizeDebt, toMoneyNumber } from '../../common/finance/finance.utils'

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: true,
        _count: { select: { sites: true, residents: true } },
      },
    })
    if (!tenant) throw new NotFoundException('Tenant bulunamadı')
    return tenant
  }

  async updateMe(tenantId: string, dto: UpdateTenantDto) {
    await this.findMe(tenantId)
    return this.prisma.tenant.update({ where: { id: tenantId }, data: dto })
  }

  async getPaymentGatewayConfig(tenantId: string) {
    const config = await this.prisma.tenantPaymentGatewayConfig.findFirst({
      where: { tenantId, isActive: true },
    })
    if (!config) return null
    return {
      id: config.id,
      provider: config.provider,
      mode: config.mode,
      apiKey: config.apiKey,
      secretKeyMasked: config.secretKey.slice(-4).padStart(config.secretKey.length, '*'),
      merchantName: config.merchantName,
      merchantId: config.merchantId,
      isActive: config.isActive,
      updatedAt: config.updatedAt,
    }
  }

  async upsertPaymentGatewayConfig(tenantId: string, dto: UpsertTenantGatewayConfigDto) {
    return this.prisma.tenantPaymentGatewayConfig.upsert({
      where: { tenantId_provider: { tenantId, provider: dto.provider } },
      create: { tenantId, ...dto },
      update: { ...dto, updatedAt: new Date() },
    })
  }

  async getWorkSummary(tenantId: string, siteId?: string) {
    const duesWhere: Record<string, unknown> = {
      tenantId,
      ...(siteId ? { unit: { siteId } } : {}),
    }

    const ledgerWhere: Record<string, unknown> = {
      tenantId,
      ...(siteId ? { unit: { siteId } } : {}),
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const [
      ledgerNet,
      ledgerExpected,
      ledgerPaymentsTotal,
      ledgerRefundsTotal,
      ledgerPaymentsMonth,
      ledgerRefundsMonth,
      overdueCount,
      debtors,
      recentPayments,
    ] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({
        where: ledgerWhere,
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerWhere,
          entryType: { in: [LedgerEntryType.CHARGE, LedgerEntryType.ADJUSTMENT, LedgerEntryType.WAIVER] },
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerWhere,
          entryType: LedgerEntryType.PAYMENT,
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerWhere,
          entryType: LedgerEntryType.REFUND,
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerWhere,
          entryType: LedgerEntryType.PAYMENT,
          effectiveAt: { gte: monthStart, lt: monthEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          ...ledgerWhere,
          entryType: LedgerEntryType.REFUND,
          effectiveAt: { gte: monthStart, lt: monthEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.dues.count({
        where: { ...duesWhere, status: DuesStatus.OVERDUE },
      }),
      this.prisma.dues.findMany({
        where: {
          ...duesWhere,
          status: { in: [DuesStatus.PENDING, DuesStatus.PARTIALLY_PAID, DuesStatus.OVERDUE] },
        },
        include: {
          unit: {
            select: {
              number: true,
              site: { select: { name: true } },
              occupancies: {
                where: { isActive: true },
                take: 1,
                orderBy: [{ isPrimaryResponsible: 'desc' }, { createdAt: 'asc' }],
                include: {
                  resident: {
                    select: { firstName: true, lastName: true, type: true },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 10,
      }),
      this.prisma.payment.findMany({
        where: {
          tenantId,
          status: PaymentStatus.CONFIRMED,
          ...(siteId ? { unit: { siteId } } : {}),
        },
        include: {
          unit: { include: { site: true } },
          paidByResident: { select: { firstName: true, lastName: true } },
        },
        orderBy: { paidAt: 'desc' },
        take: 8,
      }),
    ])

    const totalExpected = toMoneyNumber(ledgerExpected._sum.amount)
    const totalPayments = Math.abs(toMoneyNumber(ledgerPaymentsTotal._sum.amount))
    const totalRefunds = Math.abs(toMoneyNumber(ledgerRefundsTotal._sum.amount))
    const totalCollected = Math.max(0, totalPayments - totalRefunds)
    const monthPayments = Math.abs(toMoneyNumber(ledgerPaymentsMonth._sum.amount))
    const monthRefunds = Math.abs(toMoneyNumber(ledgerRefundsMonth._sum.amount))
    const thisMonthCollection = Math.max(0, monthPayments - monthRefunds)
    const totalDebt = normalizeDebt(ledgerNet._sum.amount)
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0

    const nowMs = Date.now()
    const ledgerRemainingMap = await this.mapDuesRemainingByLedger(
      tenantId,
      debtors.map((due) => due.id),
    )

    const debtorRows = debtors.map((due) => {
      const remainingAmount = Math.max(
        0,
        ledgerRemainingMap.get(due.id) ?? Number(due.amount),
      )
      const paidAmount = Math.max(0, Number(due.amount) - remainingAmount)
      const responsible = due.unit.occupancies[0]?.resident

      return {
        id: due.id,
        duesId: due.id,
        unitNumber: due.unit.number,
        siteName: due.unit.site.name,
        amount: Number(due.amount),
        paidAmount,
        remainingAmount,
        dueDate: due.dueDate,
        status: due.status,
        residentName: responsible ? `${responsible.firstName} ${responsible.lastName}` : null,
        residentType: responsible?.type ?? null,
        overdueDays: Math.max(0, Math.floor((nowMs - due.dueDate.getTime()) / (1000 * 60 * 60 * 24))),
        priorityScore: Math.min(
          100,
          Math.round(
            Math.max(0, Math.floor((nowMs - due.dueDate.getTime()) / (1000 * 60 * 60 * 24))) * 4
              + remainingAmount / 150
              + (due.status === DuesStatus.OVERDUE ? 20 : 0),
          ),
        ),
      }
    })

    const overdueDebt = debtorRows
      .filter((item) => item.status === DuesStatus.OVERDUE)
      .reduce((sum, item) => sum + item.remainingAmount, 0)

    return {
      kpi: {
        totalDebt,
        thisMonthCollection,
        overdueCount,
        overdueDebt,
        collectionRate,
      },
      debtors: debtorRows,
      recentPayments: recentPayments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        paidAt: payment.paidAt,
        method: payment.method,
        duesId: payment.duesId,
        unitNumber: payment.unit.number,
        siteName: payment.unit.site.name,
        residentName: payment.paidByResident
          ? `${payment.paidByResident.firstName} ${payment.paidByResident.lastName}`
          : null,
      })),
      alerts: {
        highPriorityDebtors: debtorRows.filter((item) => item.status === DuesStatus.OVERDUE).length,
        openDebtItems: debtorRows.length,
      },
    }
  }

  async getWorkPortfolio(tenantId: string) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const sites = await this.prisma.site.findMany({
      where: { tenantId, isActive: true },
      include: { _count: { select: { units: true } } },
      orderBy: { name: 'asc' },
    })

    const rows = await Promise.all(
      sites.map(async (site) => {
        const [
          ledgerNet,
          ledgerExpected,
          ledgerPaymentsTotal,
          ledgerRefundsTotal,
          ledgerPaymentsMonth,
          ledgerRefundsMonth,
          occupiedUnits,
          overdueUnits,
        ] = await Promise.all([
          this.prisma.ledgerEntry.aggregate({
            where: { tenantId, unit: { siteId: site.id } },
            _sum: { amount: true },
          }),
          this.prisma.ledgerEntry.aggregate({
            where: {
              tenantId,
              unit: { siteId: site.id },
              entryType: { in: [LedgerEntryType.CHARGE, LedgerEntryType.ADJUSTMENT, LedgerEntryType.WAIVER] },
            },
            _sum: { amount: true },
          }),
          this.prisma.ledgerEntry.aggregate({
            where: {
              tenantId,
              unit: { siteId: site.id },
              entryType: LedgerEntryType.PAYMENT,
            },
            _sum: { amount: true },
          }),
          this.prisma.ledgerEntry.aggregate({
            where: {
              tenantId,
              unit: { siteId: site.id },
              entryType: LedgerEntryType.REFUND,
            },
            _sum: { amount: true },
          }),
          this.prisma.ledgerEntry.aggregate({
            where: {
              tenantId,
              unit: { siteId: site.id },
              entryType: LedgerEntryType.PAYMENT,
              effectiveAt: { gte: monthStart, lt: monthEnd },
            },
            _sum: { amount: true },
          }),
          this.prisma.ledgerEntry.aggregate({
            where: {
              tenantId,
              unit: { siteId: site.id },
              entryType: LedgerEntryType.REFUND,
              effectiveAt: { gte: monthStart, lt: monthEnd },
            },
            _sum: { amount: true },
          }),
          this.prisma.unitOccupancy.findMany({
            where: { tenantId, isActive: true, unit: { siteId: site.id } },
            select: { unitId: true },
            distinct: ['unitId'],
          }),
          this.prisma.dues.findMany({
            where: {
              tenantId,
              unit: { siteId: site.id },
              status: DuesStatus.OVERDUE,
            },
            select: { unitId: true },
            distinct: ['unitId'],
          }),
        ])

        const totalExpected = toMoneyNumber(ledgerExpected._sum.amount)
        const totalPayments = Math.abs(toMoneyNumber(ledgerPaymentsTotal._sum.amount))
        const totalRefunds = Math.abs(toMoneyNumber(ledgerRefundsTotal._sum.amount))
        const totalCollected = Math.max(0, totalPayments - totalRefunds)
        const totalDebt = normalizeDebt(ledgerNet._sum.amount)
        const monthPayments = Math.abs(toMoneyNumber(ledgerPaymentsMonth._sum.amount))
        const monthRefunds = Math.abs(toMoneyNumber(ledgerRefundsMonth._sum.amount))
        const thisMonthCollection = Math.max(0, monthPayments - monthRefunds)

        const totalUnits = site._count.units
        const occupied = occupiedUnits.length

        return {
          id: site.id,
          name: site.name,
          city: site.city,
          totalUnits,
          occupiedUnits: occupied,
          occupancyRate: totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0,
          totalDebt,
          expectedCollection: totalExpected,
          totalCollected,
          collectionRate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
          thisMonthCollection,
          overdueUnits: overdueUnits.length,
          riskLevel:
            overdueUnits.length > 0 && totalUnits > 0 && overdueUnits.length / totalUnits >= 0.25
              ? 'HIGH'
              : overdueUnits.length > 0
                ? 'MEDIUM'
                : 'LOW',
          isActive: site.isActive,
        }
      }),
    )

    return rows
  }

  private async mapDuesRemainingByLedger(tenantId: string, duesIds: string[]) {
    const remainingMap = new Map<string, number>()
    if (duesIds.length === 0) return remainingMap

    const [duesEntries, duesPayments] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: {
          tenantId,
          OR: [
            { referenceType: LedgerReferenceType.DUES, referenceId: { in: duesIds } },
            { referenceType: LedgerReferenceType.WAIVER, referenceId: { in: duesIds } },
            { referenceType: LedgerReferenceType.ADJUSTMENT, referenceId: { in: duesIds } },
          ],
        },
        select: { referenceId: true, amount: true },
      }),
      this.prisma.payment.findMany({
        where: {
          tenantId,
          duesId: { in: duesIds },
          status: PaymentStatus.CONFIRMED,
        },
        select: { id: true, duesId: true },
      }),
    ])

    for (const entry of duesEntries) {
      remainingMap.set(
        entry.referenceId,
        (remainingMap.get(entry.referenceId) ?? 0) + toMoneyNumber(entry.amount),
      )
    }

    if (duesPayments.length === 0) return remainingMap

    const paymentIdToDuesId = new Map<string, string>()
    const paymentIds: string[] = []
    for (const payment of duesPayments) {
      if (!payment.duesId) continue
      paymentIdToDuesId.set(payment.id, payment.duesId)
      paymentIds.push(payment.id)
    }

    if (paymentIds.length === 0) return remainingMap

    const paymentEntries = await this.prisma.ledgerEntry.findMany({
      where: {
        tenantId,
        referenceType: LedgerReferenceType.PAYMENT,
        referenceId: { in: paymentIds },
      },
      select: { referenceId: true, amount: true },
    })

    for (const entry of paymentEntries) {
      const dueId = paymentIdToDuesId.get(entry.referenceId)
      if (!dueId) continue
      remainingMap.set(dueId, (remainingMap.get(dueId) ?? 0) + toMoneyNumber(entry.amount))
    }

    return remainingMap
  }
}
