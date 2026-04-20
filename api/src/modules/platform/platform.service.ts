import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

type PlanType = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlanSummary() {
    const plans = await this.prisma.tenantPlan.findMany({
      select: {
        planType: true,
        smsCredits: true,
        maxUnits: true,
        expiresAt: true,
        tenant: { select: { isActive: true } },
      },
    })

    const now = Date.now()
    const planTypes: PlanType[] = ['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']

    return planTypes.map((planType) => {
      const rows = plans.filter((p) => p.planType === planType)
      const activeRows = rows.filter((r) => r.tenant?.isActive)
      const expired = rows.filter((r) => r.expiresAt && r.expiresAt.getTime() <= now).length
      const expiring7 = rows.filter(
        (r) =>
          r.expiresAt &&
          r.expiresAt.getTime() > now &&
          r.expiresAt.getTime() <= now + 7 * 24 * 60 * 60 * 1000,
      ).length

      return {
        planType,
        tenantCount: rows.length,
        activeTenants: activeRows.length,
        totalSmsCredits: rows.reduce((s, r) => s + r.smsCredits, 0),
        totalMaxUnits: rows.reduce((s, r) => s + r.maxUnits, 0),
        avgMaxUnits: rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.maxUnits, 0) / rows.length) : 0,
        expired,
        expiringIn7Days: expiring7,
      }
    })
  }

  async getStats() {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      tenantScopedUsers,
      totalSites,
      totalUnits,
      paymentsThisMonth,
      planGroups,
      smsCreditsAgg,
      expiringSoon,
      expired,
      recentTenants,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.tenant.count({ where: { isActive: false } }),
      this.prisma.user.count(),
      this.prisma.userTenantRole.findMany({
        where: { tenantId: { not: null }, isActive: true },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.site.count({ where: { isActive: true } }),
      this.prisma.unit.count({ where: { isActive: true } }),
      this.prisma.payment.aggregate({
        where: { status: 'CONFIRMED', paidAt: { gte: monthStart } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.tenantPlan.groupBy({
        by: ['planType'],
        _count: { _all: true },
      }),
      this.prisma.tenantPlan.aggregate({ _sum: { smsCredits: true } }),
      this.prisma.tenantPlan.count({
        where: { expiresAt: { not: null, gt: now, lte: in7Days } },
      }),
      this.prisma.tenantPlan.count({
        where: { expiresAt: { not: null, lte: now } },
      }),
      this.prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          createdAt: true,
          isActive: true,
          plan: { select: { planType: true, expiresAt: true } },
        },
      }),
    ])

    const planDistribution = planGroups.reduce<Record<string, number>>((acc, row) => {
      acc[row.planType] = row._count._all
      return acc
    }, {})

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
      },
      users: { total: totalUsers, tenantScoped: tenantScopedUsers.length },
      sites: { total: totalSites },
      units: { total: totalUnits },
      paymentsThisMonth: {
        count: paymentsThisMonth._count,
        totalAmount: paymentsThisMonth._sum.amount ?? 0,
      },
      plans: {
        distribution: planDistribution,
        expiringIn7Days: expiringSoon,
        expiringIn30Days: await this.prisma.tenantPlan.count({
          where: { expiresAt: { not: null, gt: now, lte: in30Days } },
        }),
        expired,
      },
      sms: {
        totalCredits: smsCreditsAgg._sum.smsCredits ?? 0,
      },
      recentTenants,
    }
  }
}
