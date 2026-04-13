import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateSiteStaffDto, UpdateSiteStaffDto, SiteStaffFilterDto } from '@sakin/shared'

@Injectable()
export class SiteStaffService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSiteStaffDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const site = await db.site.findFirst({ where: { id: dto.siteId } })
    if (!site) throw new NotFoundException('Site bulunamadı')

    return db.siteStaff.create({
      data: { ...dto, tenantId },
      include: { site: { select: { name: true } } },
    })
  }

  async findAll(filter: SiteStaffFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = {}
    if (filter.siteId) where['siteId'] = filter.siteId
    if (filter.role) where['role'] = filter.role
    if (filter.isActive !== undefined) where['isActive'] = filter.isActive

    const [data, total] = await Promise.all([
      db.siteStaff.findMany({
        where,
        include: { site: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.siteStaff.count({ where }),
    ])

    return {
      data,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const staff = await db.siteStaff.findFirst({
      where: { id },
      include: { site: { select: { name: true } } },
    })
    if (!staff) throw new NotFoundException('Personel kaydı bulunamadı')
    return staff
  }

  async update(id: string, dto: UpdateSiteStaffDto, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.siteStaff.update({
      where: { id },
      data: dto,
      include: { site: { select: { name: true } } },
    })
  }

  async delete(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.siteStaff.update({
      where: { id },
      data: { isActive: false, endDate: new Date() },
    })
  }
}
