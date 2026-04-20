import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface ReportFilter {
  from?: Date
  to?: Date
  tenantId?: string
  isActive?: boolean
}

@Injectable()
export class PlatformReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Firma durumu: tenant bazlı site/daire/kullanıcı/aidat/tahsilat özeti
   */
  async tenantStatus(filter: ReportFilter) {
    const where: Record<string, unknown> = {}
    if (filter.tenantId) where['id'] = filter.tenantId
    if (filter.isActive !== undefined) where['isActive'] = filter.isActive

    const tenants = await this.prisma.tenant.findMany({
      where,
      include: {
        plan: true,
        _count: { select: { sites: true, units: true, users: true, dues: true } },
      },
      orderBy: { name: 'asc' },
    })

    const paymentWhere: Record<string, unknown> = { status: 'CONFIRMED' }
    if (filter.from || filter.to) {
      paymentWhere['paidAt'] = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      }
    }
    const payments = await this.prisma.payment.groupBy({
      by: ['tenantId'],
      where: paymentWhere,
      _sum: { amount: true },
      _count: true,
    })
    const paymentByTenant = new Map(
      payments.map((p) => [p.tenantId, { total: Number(p._sum.amount ?? 0), count: p._count }]),
    )

    return tenants.map((t) => {
      const payments = paymentByTenant.get(t.id) ?? { total: 0, count: 0 }
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        city: t.city,
        isActive: t.isActive,
        planType: t.plan?.planType ?? null,
        planExpiresAt: t.plan?.expiresAt ?? null,
        sites: t._count.sites,
        units: t._count.units,
        users: t._count.users,
        dues: t._count.dues,
        paymentsCount: payments.count,
        paymentsTotal: payments.total,
      }
    })
  }

  /**
   * Lisans raporu: planlar + kalan gün + durum
   */
  async license(filter: ReportFilter) {
    const plans = await this.prisma.tenantPlan.findMany({
      where: filter.tenantId ? { tenantId: filter.tenantId } : {},
      include: { tenant: { select: { id: true, name: true, slug: true, city: true, isActive: true } } },
      orderBy: { expiresAt: 'asc' },
    })

    const now = Date.now()
    return plans
      .filter((p) => (filter.isActive === undefined ? true : p.tenant?.isActive === filter.isActive))
      .map((p) => {
        const daysLeft = p.expiresAt
          ? Math.ceil((p.expiresAt.getTime() - now) / (24 * 60 * 60 * 1000))
          : null
        const state =
          daysLeft === null
            ? 'NO_EXPIRY'
            : daysLeft <= 0
              ? 'EXPIRED'
              : daysLeft <= 7
                ? 'EXPIRING_SOON'
                : daysLeft <= 30
                  ? 'EXPIRING_IN_MONTH'
                  : 'OK'
        return {
          tenantId: p.tenantId,
          tenantName: p.tenant?.name ?? '',
          slug: p.tenant?.slug ?? '',
          city: p.tenant?.city ?? '',
          isActive: p.tenant?.isActive ?? false,
          planType: p.planType,
          smsCredits: p.smsCredits,
          maxUnits: p.maxUnits,
          expiresAt: p.expiresAt,
          daysLeft,
          state,
        }
      })
  }

  /**
   * SMS kullanım: tenant + dönem + kanal bazlı gönderim sayıları
   */
  async smsUsage(filter: ReportFilter) {
    const where: Record<string, unknown> = { channel: 'SMS' }
    if (filter.tenantId) where['tenantId'] = filter.tenantId
    if (filter.from || filter.to) {
      where['createdAt'] = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      }
    }

    const grouped = await this.prisma.communicationLog.groupBy({
      by: ['tenantId', 'status'],
      where,
      _count: true,
    })

    const tenantIds = Array.from(new Set(grouped.map((g) => g.tenantId)))
    const [tenants, plans] = await Promise.all([
      tenantIds.length
        ? this.prisma.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true, slug: true, isActive: true },
          })
        : [],
      tenantIds.length
        ? this.prisma.tenantPlan.findMany({
            where: { tenantId: { in: tenantIds } },
            select: { tenantId: true, smsCredits: true },
          })
        : [],
    ])
    const tenantMap = new Map(tenants.map((t) => [t.id, t]))
    const creditMap = new Map(plans.map((p) => [p.tenantId, p.smsCredits]))

    const rows = tenantIds.map((id) => {
      const statuses = grouped.filter((g) => g.tenantId === id)
      const total = statuses.reduce((s, r) => s + r._count, 0)
      const delivered = statuses.find((s) => s.status === 'DELIVERED')?._count ?? 0
      const failed = statuses.find((s) => s.status === 'FAILED')?._count ?? 0
      const queued = statuses.find((s) => s.status === 'QUEUED')?._count ?? 0
      return {
        tenantId: id,
        tenantName: tenantMap.get(id)?.name ?? '—',
        slug: tenantMap.get(id)?.slug ?? '',
        isActive: tenantMap.get(id)?.isActive ?? false,
        totalSent: total,
        delivered,
        failed,
        queued,
        remainingCredits: creditMap.get(id) ?? 0,
      }
    })

    return rows.sort((a, b) => b.totalSent - a.totalSent)
  }

  /**
   * Sistem aktivite raporu: tenant create/update/suspend/plan aksiyonları
   */
  async systemActivity(filter: ReportFilter) {
    const where: Record<string, unknown> = {}
    if (filter.tenantId) where['tenantId'] = filter.tenantId
    if (filter.from || filter.to) {
      where['createdAt'] = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      }
    }

    const [total, byAction] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
      }),
    ])

    const recent = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const userIds = Array.from(new Set(recent.map((r) => r.userId)))
    const tenantIds = Array.from(new Set(recent.map((r) => r.tenantId).filter((x): x is string => !!x)))
    const [users, tenants] = await Promise.all([
      userIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, displayName: true },
          })
        : [],
      tenantIds.length
        ? this.prisma.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true },
          })
        : [],
    ])
    const userMap = new Map(users.map((u) => [u.id, u]))
    const tenantMap = new Map(tenants.map((t) => [t.id, t]))

    return {
      total,
      byAction: byAction.reduce<Record<string, number>>((acc, row) => {
        acc[row.action] = row._count
        return acc
      }, {}),
      recent: recent.map((r) => ({
        ...r,
        actor: userMap.get(r.userId) ?? null,
        tenantName: r.tenantId ? tenantMap.get(r.tenantId)?.name ?? null : null,
      })),
    }
  }

  /**
   * Hata & sağlık: ödeme başarısız, SMS başarısız, askıda tenant, süresi dolmuş lisans
   */
  async healthErrors(filter: ReportFilter) {
    const dateWhere = filter.from || filter.to
      ? { createdAt: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } }
      : {}

    const [failedPayments, failedSms, suspendedTenants, expiredPlans] = await Promise.all([
      this.prisma.payment.count({
        where: {
          status: 'FAILED',
          ...(filter.tenantId ? { tenantId: filter.tenantId } : {}),
          ...dateWhere,
        },
      }),
      this.prisma.communicationLog.count({
        where: {
          channel: 'SMS',
          status: 'FAILED',
          ...(filter.tenantId ? { tenantId: filter.tenantId } : {}),
          ...dateWhere,
        },
      }),
      this.prisma.tenant.count({
        where: { isActive: false, ...(filter.tenantId ? { id: filter.tenantId } : {}) },
      }),
      this.prisma.tenantPlan.count({
        where: {
          expiresAt: { not: null, lte: new Date() },
          ...(filter.tenantId ? { tenantId: filter.tenantId } : {}),
        },
      }),
    ])

    const recentFailures = await this.prisma.communicationLog.findMany({
      where: {
        status: 'FAILED',
        ...(filter.tenantId ? { tenantId: filter.tenantId } : {}),
        ...dateWhere,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        tenantId: true,
        channel: true,
        recipientPhone: true,
        errorMessage: true,
        createdAt: true,
        tenant: { select: { name: true } },
      },
    })

    return {
      counts: { failedPayments, failedSms, suspendedTenants, expiredPlans },
      recentFailures: recentFailures.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        tenantName: r.tenant?.name ?? '—',
        channel: r.channel,
        recipient: r.recipientPhone ?? '',
        error: r.errorMessage ?? '',
        createdAt: r.createdAt,
      })),
    }
  }
}
