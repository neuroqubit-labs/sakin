import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateCommunicationLogDto, CommunicationLogFilterDto } from '@sakin/shared'

@Injectable()
export class CommunicationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCommunicationLogDto, tenantId: string, userId?: string) {
    const db = this.prisma.forTenant(tenantId)
    return db.communicationLog.create({
      data: { ...dto, tenantId, sentByUserId: userId ?? null },
    })
  }

  async findAll(filter: CommunicationLogFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = {}
    if (filter.siteId) where['siteId'] = filter.siteId
    if (filter.residentId) where['residentId'] = filter.residentId
    if (filter.channel) where['channel'] = filter.channel
    if (filter.status) where['status'] = filter.status

    const [data, total] = await Promise.all([
      db.communicationLog.findMany({
        where,
        include: { resident: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.communicationLog.count({ where }),
    ])

    return {
      data,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const log = await db.communicationLog.findFirst({ where: { id } })
    if (!log) throw new NotFoundException('İletişim kaydı bulunamadı')
    return log
  }
}
