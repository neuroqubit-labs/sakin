import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateMeetingDto, UpdateMeetingDto, MeetingFilterDto, CreateMeetingDecisionDto } from '@sakin/shared'

@Injectable()
export class MeetingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMeetingDto, tenantId: string, userId?: string) {
    const db = this.prisma.forTenant(tenantId)
    const site = await db.site.findFirst({ where: { id: dto.siteId } })
    if (!site) throw new NotFoundException('Site bulunamadı')
    return db.meeting.create({
      data: { ...dto, tenantId, createdById: userId ?? null },
      include: { site: { select: { name: true } }, decisions: true },
    })
  }

  async findAll(filter: MeetingFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = {}
    if (filter.siteId) where['siteId'] = filter.siteId
    if (filter.type) where['type'] = filter.type
    if (filter.status) where['status'] = filter.status
    if (filter.dateFrom || filter.dateTo) {
      where['date'] = {
        ...(filter.dateFrom ? { gte: filter.dateFrom } : {}),
        ...(filter.dateTo ? { lte: filter.dateTo } : {}),
      }
    }

    const [data, total] = await Promise.all([
      db.meeting.findMany({
        where: { ...where, deletedAt: null },
        include: { site: { select: { name: true } }, decisions: true },
        orderBy: { date: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.meeting.count({ where: { ...where, deletedAt: null } }),
    ])

    return {
      data,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const meeting = await db.meeting.findFirst({
      where: { id, deletedAt: null },
      include: { site: { select: { name: true } }, decisions: true },
    })
    if (!meeting) throw new NotFoundException('Toplantı bulunamadı')
    return meeting
  }

  async update(id: string, dto: UpdateMeetingDto, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.meeting.update({
      where: { id },
      data: dto,
      include: { site: { select: { name: true } }, decisions: true },
    })
  }

  async delete(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.meeting.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async addDecision(meetingId: string, dto: CreateMeetingDecisionDto, tenantId: string) {
    await this.findOne(meetingId, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.meetingDecision.create({ data: { ...dto, meetingId, tenantId } })
  }

  async deleteDecision(meetingId: string, decisionId: string, tenantId: string) {
    await this.findOne(meetingId, tenantId)
    const db = this.prisma.forTenant(tenantId)
    const decision = await db.meetingDecision.findFirst({ where: { id: decisionId, meetingId } })
    if (!decision) throw new NotFoundException('Karar bulunamadı')
    return db.meetingDecision.delete({ where: { id: decisionId } })
  }
}
