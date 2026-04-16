import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import * as crypto from 'crypto'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'
import type { InviteUserDto, UpdateTenantDto, UpdateTenantUserDto, UpsertTenantGatewayConfigDto } from '@sakin/shared'
import { DuesStatus, LedgerEntryType, LedgerReferenceType, PaymentStatus } from '@sakin/shared'
import { normalizeDebt, toMoneyNumber } from '../../common/finance/finance.utils'
import { mapDuesRemainingByLedger } from '../../common/finance/ledger-balance.util'

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(tenantId: string) {
    const roles = await this.prisma.userTenantRole.findMany({
      where: { tenantId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            displayName: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return roles.map((r) => ({
      id: r.user.id,
      email: r.user.email,
      phoneNumber: r.user.phoneNumber,
      displayName: r.user.displayName,
      isActive: r.user.isActive,
      role: r.role,
      createdAt: r.user.createdAt,
    }))
  }

  async findMe(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: true,
        _count: { select: { sites: true, residents: true } },
      },
    })
    if (!tenant) throw new NotFoundException('Tenant bulunamadı')

    const unitCount = await this.prisma.site.aggregate({
      where: { tenantId },
      _sum: { totalUnits: true },
    })

    return {
      ...tenant,
      _count: {
        ...tenant._count,
        units: unitCount._sum.totalUnits ?? 0,
      },
    }
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
    const ledgerRemainingMap = await mapDuesRemainingByLedger(
      this.prisma,
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

  // ─── Kullanıcı Yönetimi ──────────────────────────────────────────────────────

  /**
   * Yeni personel / yönetici davet et.
   * Geçici şifre ile kullanıcı oluşturur, DB'ye kaydeder.
   * Admin geçici şifreyi kullanıcıyla paylaşır.
   */
  async inviteUser(tenantId: string, dto: InviteUserDto) {
    // Aynı e-posta bu tenant'a zaten atanmış mı kontrol et
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
      include: {
        tenantRoles: {
          where: { tenantId, isActive: true },
        },
      },
    })

    if (existing?.tenantRoles.length) {
      throw new ConflictException('Bu e-posta adresi zaten bu şirkete kayıtlı')
    }

    // Geçici şifre üret
    const tempPassword = crypto.randomBytes(8).toString('hex')
    const passwordHash = await bcrypt.hash(tempPassword, 10)

    // DB'de User kaydı bul veya oluştur
    let dbUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })

    if (!dbUser) {
      dbUser = await this.prisma.user.create({
        data: {
          email: dto.email,
          displayName: dto.displayName,
          passwordHash,
        },
      })
    } else {
      // Mevcut kullanıcıya şifre atanmamışsa ata
      if (!dbUser.passwordHash) {
        await this.prisma.user.update({
          where: { id: dbUser.id },
          data: { passwordHash },
        })
      }
    }

    // Tenant rolü ata (upsert — daha önce pasifleştirilmiş olabilir)
    await this.prisma.userTenantRole.upsert({
      where: {
        userId_tenantId: { userId: dbUser.id, tenantId },
      },
      update: { role: dto.role, isActive: true },
      create: { userId: dbUser.id, tenantId, role: dto.role, isActive: true },
    })

    return {
      userId: dbUser.id,
      email: dto.email,
      displayName: dto.displayName,
      role: dto.role,
      tempPassword,
    }
  }

  /**
   * Mevcut kullanıcının rolünü veya aktiflik durumunu güncelle.
   */
  async updateTenantUser(tenantId: string, userId: string, dto: UpdateTenantUserDto) {
    const roleRecord = await this.prisma.userTenantRole.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    })

    if (!roleRecord) {
      throw new NotFoundException('Bu kullanıcı bu şirkete ait değil')
    }

    await this.prisma.userTenantRole.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: {
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    })

    return { userId, tenantId, ...dto }
  }

  /**
   * Kullanıcıyı bu tenant'tan pasifleştir (silme değil — audit log korunur).
   */
  async deactivateTenantUser(tenantId: string, userId: string) {
    const roleRecord = await this.prisma.userTenantRole.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    })

    if (!roleRecord) {
      throw new NotFoundException('Bu kullanıcı bu şirkete ait değil')
    }

    if (!roleRecord.isActive) {
      throw new BadRequestException('Kullanıcı zaten pasif')
    }

    await this.prisma.userTenantRole.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: { isActive: false },
    })

    return { userId, deactivated: true }
  }

}
