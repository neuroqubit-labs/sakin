import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateTenantDto, UpdateTenantDto, UpdateTenantPlanDto, TenantFilterDto } from '@sakin/shared'

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

    return {
      data,
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
    return tenant
  }

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } })
    if (existing) throw new ConflictException(`'${dto.slug}' slug değeri zaten kullanılıyor`)

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: dto })
      await tx.tenantPlan.create({
        data: {
          tenantId: tenant.id,
          planType: 'TRIAL',
          smsCredits: 50,
          maxUnits: 50,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })
      return tx.tenant.findUnique({ where: { id: tenant.id }, include: { plan: true } })
    })
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id)
    return this.prisma.tenant.update({ where: { id }, data: dto })
  }

  async activate(id: string) {
    await this.findOne(id)
    return this.prisma.tenant.update({ where: { id }, data: { isActive: true } })
  }

  async deactivate(id: string) {
    await this.findOne(id)
    return this.prisma.tenant.update({ where: { id }, data: { isActive: false } })
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
