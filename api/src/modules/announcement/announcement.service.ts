import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateAnnouncementDto, UpdateAnnouncementDto, AnnouncementFilterDto } from '@sakin/shared'

@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAnnouncementDto, tenantId: string, userId: string) {
    const db = this.prisma.forTenant(tenantId)

    if (dto.siteId) {
      const site = await db.site.findFirst({ where: { id: dto.siteId } })
      if (!site) throw new NotFoundException('Site bulunamadı')
    }

    return db.announcement.create({
      data: {
        ...dto,
        tenantId,
        createdById: userId,
        publishedAt: dto.publishedAt ?? new Date(),
      },
      include: { site: { select: { name: true } } },
    })
  }

  async findAll(filter: AnnouncementFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = { deletedAt: null }
    if (filter.siteId) where['siteId'] = filter.siteId
    if (filter.publishedOnly) {
      where['publishedAt'] = { lte: new Date() }
    }

    const [data, total] = await Promise.all([
      db.announcement.findMany({
        where,
        include: { site: { select: { name: true } } },
        orderBy: { publishedAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.announcement.count({ where }),
    ])

    return {
      data,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const announcement = await db.announcement.findFirst({
      where: { id, deletedAt: null },
      include: { site: true },
    })
    if (!announcement) throw new NotFoundException('Duyuru bulunamadı')
    return announcement
  }

  async update(id: string, dto: UpdateAnnouncementDto, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.announcement.update({ where: { id }, data: dto })
  }

  async delete(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.announcement.update({ where: { id }, data: { deletedAt: new Date() } })
  }
}
