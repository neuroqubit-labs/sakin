import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { UserRole } from '@sakin/shared'
import type { CreateTicketDto, UpdateTicketDto, TicketFilterDto, CreateTicketCommentDto } from '@sakin/shared'

interface ReaderScope {
  role: UserRole
  userId?: string
  unitId?: string | null
}

@Injectable()
export class TicketService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTicketDto, tenantId: string, userId?: string, scope?: ReaderScope) {
    const db = this.prisma.forTenant(tenantId)

    // RESIDENT için siteId/unitId'yi kendi occupancy'sinden türet — client override edemez.
    let siteId = dto.siteId
    let unitId = dto.unitId
    if (scope?.role === UserRole.RESIDENT) {
      if (!scope.unitId) {
        throw new ForbiddenException('Aktif bir daireniz olmadan talep oluşturamazsınız')
      }
      const unit = await db.unit.findFirst({
        where: { id: scope.unitId },
        select: { id: true, siteId: true },
      })
      if (!unit) throw new NotFoundException('Daire bulunamadı')
      siteId = unit.siteId
      unitId = unit.id
    } else {
      if (!siteId) throw new NotFoundException('siteId zorunludur')
      const site = await db.site.findFirst({ where: { id: siteId } })
      if (!site) throw new NotFoundException('Site bulunamadı')
    }

    return db.ticket.create({
      data: { ...dto, siteId, unitId, tenantId, reportedById: userId ?? null },
      include: {
        site: { select: { name: true } },
        unit: { select: { number: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    })
  }

  async findAll(filter: TicketFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = { deletedAt: null }
    if (filter.siteId) where['siteId'] = filter.siteId
    if (filter.unitId) where['unitId'] = filter.unitId
    if (filter.category) where['category'] = filter.category
    if (filter.priority) where['priority'] = filter.priority
    if (filter.status) where['status'] = filter.status
    if (filter.assignedToId) where['assignedToId'] = filter.assignedToId

    const [data, total] = await Promise.all([
      db.ticket.findMany({
        where,
        include: {
          site: { select: { name: true } },
          unit: { select: { number: true } },
          assignedTo: { select: { firstName: true, lastName: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.ticket.count({ where }),
    ])

    return {
      data,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }

  async findOne(id: string, tenantId: string, scope?: ReaderScope) {
    const db = this.prisma.forTenant(tenantId)
    const ticket = await db.ticket.findFirst({
      where: { id, deletedAt: null },
      include: {
        site: { select: { name: true } },
        unit: { select: { number: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { displayName: true } } },
        },
      },
    })
    if (!ticket) throw new NotFoundException('Talep bulunamadı')
    if (scope?.role === UserRole.RESIDENT && ticket.reportedById !== scope.userId) {
      throw new ForbiddenException('Bu talebi görüntüleme yetkiniz yok')
    }
    return ticket
  }

  async findMyTickets(tenantId: string, userId: string, filter: TicketFilterDto) {
    const db = this.prisma.forTenant(tenantId)
    const where: Record<string, unknown> = { deletedAt: null, reportedById: userId }
    if (filter.siteId) where['siteId'] = filter.siteId
    if (filter.unitId) where['unitId'] = filter.unitId
    if (filter.status) where['status'] = filter.status

    const [data, total] = await Promise.all([
      db.ticket.findMany({
        where,
        include: {
          site: { select: { name: true } },
          unit: { select: { number: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.ticket.count({ where }),
    ])

    return {
      data,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }

  async update(id: string, dto: UpdateTicketDto, tenantId: string) {
    const ticket = await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)

    const updateData: Record<string, unknown> = { ...dto }
    if (dto.status === 'RESOLVED' && !ticket.resolvedAt) {
      updateData['resolvedAt'] = new Date()
    }
    if (dto.status === 'CLOSED' && !ticket.closedAt) {
      updateData['closedAt'] = new Date()
    }

    return db.ticket.update({
      where: { id },
      data: updateData,
      include: {
        site: { select: { name: true } },
        unit: { select: { number: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    })
  }

  async delete(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.ticket.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async addComment(
    ticketId: string,
    dto: CreateTicketCommentDto,
    tenantId: string,
    userId: string,
    scope?: ReaderScope,
  ) {
    await this.findOne(ticketId, tenantId, scope)
    const db = this.prisma.forTenant(tenantId)
    return db.ticketComment.create({
      data: { ...dto, ticketId, tenantId, authorId: userId },
      include: { author: { select: { displayName: true } } },
    })
  }
}
