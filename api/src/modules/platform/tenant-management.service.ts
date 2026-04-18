import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import * as crypto from 'crypto'
import * as bcrypt from 'bcryptjs'
import { UserRole } from '@sakin/shared'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateTenantDto, UpdateTenantDto, UpdateTenantPlanDto, TenantFilterDto, SuspendTenantDto } from '@sakin/shared'

@Injectable()
export class TenantManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: TenantFilterDto) {
    const where: Record<string, unknown> = {}
    if (filter.isActive !== undefined) where['isActive'] = filter.isActive
    if (filter.city) where['city'] = { contains: filter.city, mode: 'insensitive' }

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        include: {
          plan: true,
          _count: { select: { sites: true, users: true } },
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
        _count: { select: { sites: true, users: true, dues: true } },
      },
    })
    if (!tenant) throw new NotFoundException('Tenant bulunamadı')
    return {
      ...tenant,
      daysUntilExpiry: computeDaysUntilExpiry(tenant.plan?.expiresAt ?? null),
    }
  }

  async create(dto: CreateTenantDto) {
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

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id)
    return this.prisma.tenant.update({ where: { id }, data: dto })
  }

  async activate(id: string) {
    await this.findOne(id)
    return this.prisma.tenant.update({
      where: { id },
      data: {
        isActive: true,
        suspendedAt: null,
        suspendedReason: null,
        suspendedBy: null,
      },
    })
  }

  async deactivate(id: string, dto: SuspendTenantDto, suspendedBy: string | null) {
    await this.findOne(id)
    return this.prisma.tenant.update({
      where: { id },
      data: {
        isActive: false,
        suspendedAt: new Date(),
        suspendedReason: dto.reason,
        suspendedBy,
      },
    })
  }

  async updatePlan(id: string, dto: UpdateTenantPlanDto) {
    await this.findOne(id)
    return this.prisma.tenantPlan.upsert({
      where: { tenantId: id },
      update: dto,
      create: { tenantId: id, ...dto },
    })
  }
}

function computeDaysUntilExpiry(expiresAt: Date | null): number | null {
  if (!expiresAt) return null
  const diff = expiresAt.getTime() - Date.now()
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}
