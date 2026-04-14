import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateLegalCaseDto, UpdateLegalCaseDto, LegalCaseFilterDto, CreateLegalCaseEventDto } from '@sakin/shared'

@Injectable()
export class LegalCaseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLegalCaseDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const [site, unit, resident] = await Promise.all([
      db.site.findFirst({ where: { id: dto.siteId } }),
      db.unit.findFirst({ where: { id: dto.unitId } }),
      db.resident.findFirst({ where: { id: dto.residentId } }),
    ])
    if (!site) throw new NotFoundException('Site bulunamadı')
    if (!unit) throw new NotFoundException('Daire bulunamadı')
    if (!resident) throw new NotFoundException('Sakin bulunamadı')

    return db.legalCase.create({
      data: { ...dto, tenantId },
      include: {
        site: { select: { name: true } },
        unit: { select: { number: true } },
        resident: { select: { firstName: true, lastName: true } },
        events: true,
      },
    })
  }

  async findAll(filter: LegalCaseFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = { deletedAt: null }
    if (filter.siteId) where['siteId'] = filter.siteId
    if (filter.residentId) where['residentId'] = filter.residentId
    if (filter.stage) where['stage'] = filter.stage
    if (filter.status) where['status'] = filter.status

    const [data, total] = await Promise.all([
      db.legalCase.findMany({
        where,
        include: {
          site: { select: { name: true } },
          unit: { select: { number: true } },
          resident: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.legalCase.count({ where }),
    ])

    return {
      data,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const legalCase = await db.legalCase.findFirst({
      where: { id, deletedAt: null },
      include: {
        site: { select: { name: true } },
        unit: { select: { number: true } },
        resident: { select: { firstName: true, lastName: true } },
        events: { orderBy: { eventDate: 'asc' } },
      },
    })
    if (!legalCase) throw new NotFoundException('Hukuki süreç bulunamadı')
    return legalCase
  }

  async update(id: string, dto: UpdateLegalCaseDto, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.legalCase.update({
      where: { id },
      data: dto,
      include: {
        site: { select: { name: true } },
        unit: { select: { number: true } },
        resident: { select: { firstName: true, lastName: true } },
        events: { orderBy: { eventDate: 'asc' } },
      },
    })
  }

  async delete(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.legalCase.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async addEvent(legalCaseId: string, dto: CreateLegalCaseEventDto, tenantId: string, userId?: string) {
    await this.findOne(legalCaseId, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.legalCaseEvent.create({
      data: { ...dto, legalCaseId, tenantId, createdById: userId ?? null },
    })
  }
}
