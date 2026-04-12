import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      tenantScopedUsers,
      totalSites,
      totalUnits,
      paymentsThisMonth,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { isActive: true } }),
      this.prisma.user.count(),
      this.prisma.userTenantRole.findMany({
        where: { tenantId: { not: null }, isActive: true },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.site.count({ where: { isActive: true } }),
      this.prisma.unit.count({ where: { isActive: true } }),
      this.prisma.payment.aggregate({
        where: {
          status: 'CONFIRMED',
          paidAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    return {
      tenants: { total: totalTenants, active: activeTenants, inactive: totalTenants - activeTenants },
      users: { total: totalUsers, tenantScoped: tenantScopedUsers.length },
      sites: { total: totalSites },
      units: { total: totalUnits },
      paymentsThisMonth: {
        count: paymentsThisMonth._count,
        totalAmount: paymentsThisMonth._sum.amount ?? 0,
      },
    }
  }
}
