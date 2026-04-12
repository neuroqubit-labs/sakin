import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type {
  CreateOccupancyDto,
  OccupancyFilterDto,
  UpdateOccupancyDto,
} from '@sakin/shared'

@Injectable()
export class OccupancyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOccupancyDto, tenantId: string, userId: string) {
    const db = this.prisma.forTenant(tenantId)

    const [unit, resident] = await Promise.all([
      db.unit.findFirst({ where: { id: dto.unitId, isActive: true } }),
      db.resident.findFirst({ where: { id: dto.residentId, isActive: true } }),
    ])

    if (!unit) throw new NotFoundException('Daire bulunamadı')
    if (!resident) throw new NotFoundException('Sakin bulunamadı')

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimaryResponsible) {
        await tx.unitOccupancy.updateMany({
          where: {
            tenantId,
            unitId: dto.unitId,
            isActive: true,
            isPrimaryResponsible: true,
          },
          data: { isPrimaryResponsible: false },
        })
      }

      return tx.unitOccupancy.create({
        data: {
          tenantId,
          unitId: dto.unitId,
          residentId: dto.residentId,
          role: dto.role,
          isPrimaryResponsible: dto.isPrimaryResponsible,
          startDate: dto.startDate,
          endDate: dto.endDate,
          isActive: !dto.endDate,
          note: dto.note,
          createdByUserId: userId,
        },
      })
    })
  }

  async findAll(filter: OccupancyFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const where: Record<string, unknown> = {}
    if (filter.unitId) where['unitId'] = filter.unitId
    if (filter.residentId) where['residentId'] = filter.residentId
    if (filter.siteId) where['unit'] = { siteId: filter.siteId }
    if (filter.isActive !== undefined) where['isActive'] = filter.isActive

    const [data, total] = await Promise.all([
      db.unitOccupancy.findMany({
        where,
        include: {
          resident: true,
          unit: {
            include: {
              site: { select: { name: true } },
              block: { select: { name: true } },
            },
          },
        },
        orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.unitOccupancy.count({ where }),
    ])

    return {
      data,
      meta: {
        total,
        page: filter.page,
        limit: filter.limit,
        totalPages: Math.ceil(total / filter.limit),
      },
    }
  }

  async update(id: string, dto: UpdateOccupancyDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const existing = await db.unitOccupancy.findFirst({ where: { id } })
    if (!existing) throw new NotFoundException('Occupancy kaydı bulunamadı')

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimaryResponsible) {
        await tx.unitOccupancy.updateMany({
          where: {
            tenantId,
            unitId: existing.unitId,
            isActive: true,
            id: { not: id },
          },
          data: { isPrimaryResponsible: false },
        })
      }

      return tx.unitOccupancy.update({
        where: { id },
        data: {
          ...dto,
          isActive:
            dto.isActive ??
            (dto.endDate !== undefined ? dto.endDate === null : existing.endDate === null),
        },
      })
    })
  }

  async endOccupancy(id: string, tenantId: string, note?: string) {
    const db = this.prisma.forTenant(tenantId)
    const existing = await db.unitOccupancy.findFirst({ where: { id } })
    if (!existing) throw new NotFoundException('Occupancy kaydı bulunamadı')

    return db.unitOccupancy.update({
      where: { id },
      data: {
        endDate: new Date(),
        isActive: false,
        note: note ?? existing.note,
      },
    })
  }
}
