import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateSiteDto, UpdateSiteDto } from '@sakin/shared'

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSiteDto, tenantId: string) {
    // tenantId, forTenant() extension tarafından otomatik inject edilir
    // ancak Prisma type sistemi için explicit geçiyoruz
    return this.prisma.site.create({ data: { ...dto, tenantId } })
  }

  async findAll(tenantId: string, includeInactive = false) {
    const db = this.prisma.forTenant(tenantId)
    return db.site.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: { _count: { select: { units: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const site = await db.site.findFirst({
      where: { id },
      include: { blocks: true, units: { where: { isActive: true } } },
    })
    if (!site) throw new NotFoundException('Site bulunamadı')
    return site
  }

  async update(id: string, dto: UpdateSiteDto, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.site.update({ where: { id }, data: dto })
  }
}
