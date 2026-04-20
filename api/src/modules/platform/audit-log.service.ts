import { Injectable } from '@nestjs/common'
import type { Prisma } from '@sakin/database'
import { PrismaService } from '../../prisma/prisma.service'

export type PlatformAuditAction =
  | 'TENANT_CREATED'
  | 'TENANT_UPDATED'
  | 'TENANT_SUSPENDED'
  | 'TENANT_ACTIVATED'
  | 'TENANT_PLAN_UPDATED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'PLATFORM_SETTING_UPDATED'

interface WriteParams {
  actorUserId: string
  tenantId: string | null
  action: PlatformAuditAction
  entity?: string
  entityId?: string
  changes?: Record<string, unknown>
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

interface ListParams {
  tenantId?: string
  action?: string
  actorUserId?: string
  from?: Date
  to?: Date
  page: number
  limit: number
}

@Injectable()
export class PlatformAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  write(params: WriteParams) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.actorUserId,
        action: params.action,
        entity: params.entity ?? (params.tenantId ? 'Tenant' : 'Platform'),
        entityId: params.entityId ?? params.tenantId ?? 'platform',
        changes: (params.changes ?? undefined) as Prisma.InputJsonValue | undefined,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    })
  }

  async list(params: ListParams) {
    const where: Record<string, unknown> = {}
    if (params.tenantId) where['tenantId'] = params.tenantId
    if (params.action) where['action'] = params.action
    if (params.actorUserId) where['userId'] = params.actorUserId
    if (params.from || params.to) {
      where['createdAt'] = {
        ...(params.from ? { gte: params.from } : {}),
        ...(params.to ? { lte: params.to } : {}),
      }
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ])

    const userIds = Array.from(new Set(rows.map((r) => r.userId)))
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, displayName: true },
        })
      : []
    const userMap = new Map(users.map((u) => [u.id, u]))

    const enriched = rows.map((row) => ({
      ...row,
      actor: userMap.get(row.userId) ?? null,
    }))

    return {
      data: enriched,
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    }
  }
}
