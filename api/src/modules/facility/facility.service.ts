import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateFacilityDto, UpdateFacilityDto, FacilityFilterDto } from '@sakin/shared'

@Injectable()
export class FacilityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFacilityDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const site = await db.site.findFirst({ where: { id: dto.siteId } })
    if (!site) throw new NotFoundException('Site bulunamadı')
    return db.facility.create({ data: { ...dto, tenantId } })
  }

  async findAll(filter: FacilityFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = {}
    if (filter.siteId) where['siteId'] = filter.siteId
    if (filter.type) where['type'] = filter.type
    if (filter.isActive !== undefined) where['isActive'] = filter.isActive

    const [data, total] = await Promise.all([
      db.facility.findMany({
        where,
        include: { site: { select: { name: true } } },
        orderBy: { name: 'asc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.facility.count({ where }),
    ])

    return {
      data,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const facility = await db.facility.findFirst({
      where: { id },
      include: { site: { select: { name: true } } },
    })
    if (!facility) throw new NotFoundException('Tesis bulunamadı')
    return facility
  }

  async update(id: string, dto: UpdateFacilityDto, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.facility.update({ where: { id }, data: dto })
  }

  async delete(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.facility.update({ where: { id }, data: { isActive: false } })
  }
}
