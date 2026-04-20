import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import * as crypto from 'crypto'
import * as bcrypt from 'bcryptjs'
import { UserRole } from '@sakin/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { PlatformAuditLogService } from './audit-log.service'
import type { CreateTenantDto, UpdateTenantDto, UpdateTenantPlanDto, TenantFilterDto, SuspendTenantDto } from '@sakin/shared'

interface ActorMeta {
  userId: string
  ipAddress?: string | null
  userAgent?: string | null
}

@Injectable()
export class TenantManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: PlatformAuditLogService,
  ) {}

  async findAll(filter: TenantFilterDto) {
    const where: Record<string, unknown> = {}
    if (filter.isActive !== undefined) where['isActive'] = filter.isActive
    if (filter.city) where['city'] = { contains: filter.city, mode: 'insensitive' }

    if (filter.search) {
      const q = filter.search
      where['OR'] = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { contactEmail: { contains: q, mode: 'insensitive' } },
        { contactPhone: { contains: q, mode: 'insensitive' } },
      ]
    }

    const planWhere: Record<string, unknown> = {}
    if (filter.planType) planWhere['planType'] = filter.planType
    if (filter.expiringInDays) {
      const threshold = new Date(Date.now() + filter.expiringInDays * 24 * 60 * 60 * 1000)
      planWhere['expiresAt'] = { not: null, lte: threshold }
    }
    if (Object.keys(planWhere).length > 0) {
      where['plan'] = { is: planWhere }
    }

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        include: {
          plan: true,
          _count: { select: { sites: true, users: true, units: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.tenant.count({ where }),
    ])

    const enriched = data.map((tenant) => ({
      ...tenant,
      daysUntilExpiry: computeDaysUntilExpiry(tenant.plan?.expiresAt ?? null),
    }))

    return {
      data: enriched,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        plan: true,
        _count: { select: { sites: true, users: true, dues: true, units: true } },
      },
    })
    if (!tenant) throw new NotFoundException('Tenant bulunamadı')
    return {
      ...tenant,
      daysUntilExpiry: computeDaysUntilExpiry(tenant.plan?.expiresAt ?? null),
    }
  }

  async create(dto: CreateTenantDto, actor: ActorMeta) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } })
    if (existing) throw new ConflictException(`'${dto.slug}' slug değeri zaten kullanılıyor`)

    const emailConflict = await this.prisma.user.findUnique({ where: { email: dto.admin.email } })

    const tempPassword = crypto.randomBytes(8).toString('hex')
    const passwordHash = await bcrypt.hash(tempPassword, 10)

    const result = await this.prisma.$transaction(async (tx) => {
      const { admin, ...tenantData } = dto
      const tenant = await tx.tenant.create({ data: tenantData })

      await tx.tenantPlan.create({
        data: {
          tenantId: tenant.id,
          planType: 'TRIAL',
          smsCredits: 50,
          maxUnits: 50,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      let adminUser = emailConflict
      if (!adminUser) {
        adminUser = await tx.user.create({
          data: {
            email: admin.email,
            displayName: admin.displayName,
            passwordHash,
          },
        })
      } else if (!adminUser.passwordHash) {
        adminUser = await tx.user.update({
          where: { id: adminUser.id },
          data: { passwordHash },
        })
      }

      await tx.userTenantRole.upsert({
        where: { userId_tenantId: { userId: adminUser.id, tenantId: tenant.id } },
        update: { role: UserRole.TENANT_ADMIN, isActive: true },
        create: { userId: adminUser.id, tenantId: tenant.id, role: UserRole.TENANT_ADMIN, isActive: true },
      })

      const full = await tx.tenant.findUnique({
        where: { id: tenant.id },
        include: { plan: true },
      })

      return { tenant: full, adminUserId: adminUser.id, reusedExistingUser: !!emailConflict }
    })

    await this.auditLog.write({
      actorUserId: actor.userId,
      tenantId: result.tenant!.id,
      action: 'TENANT_CREATED',
      changes: {
        name: dto.name,
        slug: dto.slug,
        city: dto.city,
        adminEmail: dto.admin.email,
      },
      metadata: { reusedExistingUser: result.reusedExistingUser },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    })

    return {
      ...result.tenant,
      initialAdmin: {
        userId: result.adminUserId,
        email: dto.admin.email,
        displayName: dto.admin.displayName,
        tempPassword: result.reusedExistingUser ? null : tempPassword,
      },
    }
  }

  async update(id: string, dto: UpdateTenantDto, actor: ActorMeta) {
    const before = await this.findOne(id)
    const updated = await this.prisma.tenant.update({ where: { id }, data: dto })
    const changes = diffFields(before, updated, Object.keys(dto))
    if (Object.keys(changes).length > 0) {
      await this.auditLog.write({
        actorUserId: actor.userId,
        tenantId: id,
        action: 'TENANT_UPDATED',
        changes,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      })
    }
    return updated
  }

  async activate(id: string, actor: ActorMeta) {
    await this.findOne(id)
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        isActive: true,
        suspendedAt: null,
        suspendedReason: null,
        suspendedBy: null,
      },
    })
    await this.auditLog.write({
      actorUserId: actor.userId,
      tenantId: id,
      action: 'TENANT_ACTIVATED',
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    })
    return updated
  }

  async deactivate(id: string, dto: SuspendTenantDto, actor: ActorMeta) {
    await this.findOne(id)
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        isActive: false,
        suspendedAt: new Date(),
        suspendedReason: dto.reason,
        suspendedBy: actor.userId,
      },
    })
    await this.auditLog.write({
      actorUserId: actor.userId,
      tenantId: id,
      action: 'TENANT_SUSPENDED',
      changes: { reason: dto.reason },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    })
    return updated
  }

  async updatePlan(id: string, dto: UpdateTenantPlanDto, actor: ActorMeta) {
    const before = await this.findOne(id)
    const updated = await this.prisma.tenantPlan.upsert({
      where: { tenantId: id },
      update: dto,
      create: { tenantId: id, ...dto },
    })
    const beforePlan = (before.plan ?? {}) as Record<string, unknown>
    const changes = diffFields(beforePlan, updated as Record<string, unknown>, Object.keys(dto))
    if (Object.keys(changes).length > 0) {
      await this.auditLog.write({
        actorUserId: actor.userId,
        tenantId: id,
        action: 'TENANT_PLAN_UPDATED',
        changes,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      })
    }
    return updated
  }
}

function computeDaysUntilExpiry(expiresAt: Date | null): number | null {
  if (!expiresAt) return null
  const diff = expiresAt.getTime() - Date.now()
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys: string[],
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {}
  for (const key of keys) {
    const prev = normalize(before[key])
    const next = normalize(after[key])
    if (prev !== next) {
      out[key] = { from: before[key] ?? null, to: after[key] ?? null }
    }
  }
  return out
}

function normalize(v: unknown): string {
  if (v instanceof Date) return v.toISOString()
  if (v === null || v === undefined) return ''
  return String(v)
}
