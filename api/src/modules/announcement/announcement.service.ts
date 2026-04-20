import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationService } from '../notification/notification.service'
import { UserRole } from '@sakin/shared'
import type { CreateAnnouncementDto, UpdateAnnouncementDto, AnnouncementFilterDto } from '@sakin/shared'

interface AccessContext {
  role: UserRole
  unitId?: string | null
}

@Injectable()
export class AnnouncementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async create(dto: CreateAnnouncementDto, tenantId: string, userId: string) {
    const db = this.prisma.forTenant(tenantId)

    if (dto.siteId) {
      const site = await db.site.findFirst({ where: { id: dto.siteId } })
      if (!site) throw new NotFoundException('Site bulunamadı')
    }

    const created = await db.announcement.create({
      data: {
        ...dto,
        tenantId,
        createdById: userId,
        publishedAt: dto.publishedAt ?? new Date(),
      },
      include: { site: { select: { name: true } } },
    })

    // Fan-out notifications for residents when the announcement is already published.
    // Scheduled-future publishes are handled lazily: mobile hides them via publishedAt filter,
    // and residents will see them the next time the announcement is opened (no separate cron yet).
    if (created.publishedAt && created.publishedAt <= new Date()) {
      await this.notifications.createForAnnouncement(
        tenantId,
        created.id,
        created.siteId,
        created.title,
      )
    }

    return created
  }

  async findAll(filter: AnnouncementFilterDto, tenantId: string, access?: AccessContext) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = { deletedAt: null }
    if (filter.siteId) where['siteId'] = filter.siteId
    if (filter.publishedOnly) {
      where['publishedAt'] = { lte: new Date() }
    }

    // RESIDENT site-scoping: yalnızca oturduğu site(ler)e ait duyurular + tenant-geneli (siteId=null) duyurular.
    if (access?.role === UserRole.RESIDENT) {
      const allowedSiteIds = await this.getResidentSiteIds(db, access.unitId ?? null)
      where['OR'] = [
        { siteId: null },
        { siteId: { in: allowedSiteIds } },
      ]
      // RESIDENT için yayınlanmamış duyuruları gizle (publishedAt gelecekteyse görünmesin).
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

  async findOne(id: string, tenantId: string, access?: AccessContext) {
    const db = this.prisma.forTenant(tenantId)
    const announcement = await db.announcement.findFirst({
      where: { id, deletedAt: null },
      include: { site: true },
    })
    if (!announcement) throw new NotFoundException('Duyuru bulunamadı')

    if (access?.role === UserRole.RESIDENT) {
      if (announcement.siteId) {
        const allowedSiteIds = await this.getResidentSiteIds(db, access.unitId ?? null)
        if (!allowedSiteIds.includes(announcement.siteId)) {
          throw new NotFoundException('Duyuru bulunamadı')
        }
      }
      if (announcement.publishedAt && announcement.publishedAt > new Date()) {
        throw new NotFoundException('Duyuru bulunamadı')
      }
    }

    return announcement
  }

  private async getResidentSiteIds(
    db: ReturnType<PrismaService['forTenant']>,
    unitId: string | null,
  ): Promise<string[]> {
    if (!unitId) return []
    const unit = await db.unit.findFirst({
      where: { id: unitId },
      select: { siteId: true },
    })
    return unit?.siteId ? [unit.siteId] : []
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
