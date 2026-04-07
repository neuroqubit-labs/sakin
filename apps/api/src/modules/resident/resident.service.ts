import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateResidentDto, UpdateResidentDto, ResidentFilterDto } from '@sakin/shared'

@Injectable()
export class ResidentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateResidentDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    return db.resident.create({
      data: {
        ...dto,
        tenantId,
      },
    })
  }

  async findAll(filter: ResidentFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = {}
    if (filter.type) where['type'] = filter.type
    if (filter.isActive !== undefined) where['isActive'] = filter.isActive
    if (filter.search) {
      where['OR'] = [
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
        { phoneNumber: { contains: filter.search, mode: 'insensitive' } },
      ]
    }
    if (filter.siteId || filter.unitId) {
      where['occupancies'] = {
        some: {
          ...(filter.unitId ? { unitId: filter.unitId } : {}),
          ...(filter.siteId ? { unit: { siteId: filter.siteId } } : {}),
        },
      }
    }

    const [data, total] = await Promise.all([
      db.resident.findMany({
        where,
        include: {
          occupancies: {
            where: { isActive: true },
            include: {
              unit: {
                select: {
                  id: true,
                  number: true,
                  floor: true,
                  site: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.resident.count({ where }),
    ])

    return {
      data,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const resident = await db.resident.findFirst({
      where: { id },
      include: {
        occupancies: {
          include: {
            unit: {
              include: {
                site: true,
                block: true,
              },
            },
          },
          orderBy: { startDate: 'desc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })
    if (!resident) throw new NotFoundException('Sakin bulunamadı')
    return resident
  }

  async update(id: string, dto: UpdateResidentDto, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.resident.update({ where: { id }, data: dto })
  }

  async softDelete(id: string, tenantId: string) {
    await this.findOne(id, tenantId)

    return this.prisma.$transaction(async (tx) => {
      const resident = await tx.resident.update({
        where: { id },
        data: { isActive: false },
      })

      await tx.unitOccupancy.updateMany({
        where: { tenantId, residentId: id, isActive: true },
        data: { isActive: false, endDate: new Date() },
      })

      return resident
    })
  }

  async linkUser(residentId: string, userId: string, tenantId: string) {
    await this.findOne(residentId, tenantId)

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantRoles: {
          where: {
            isActive: true,
            tenantId,
          },
        },
      },
    })

    if (!user) throw new BadRequestException('Kullanıcı bulunamadı')
    if (user.tenantRoles.length === 0) {
      throw new BadRequestException('Kullanıcının tenant rolü bulunamadı')
    }

    return this.prisma.resident.update({
      where: { id: residentId },
      data: { userId },
    })
  }
}
