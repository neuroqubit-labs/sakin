import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateVendorDto, UpdateVendorDto, VendorFilterDto } from '@sakin/shared'

@Injectable()
export class VendorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVendorDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    return db.vendor.create({ data: { ...dto, tenantId } })
  }

  async findAll(filter: VendorFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = {}
    if (filter.category) where['category'] = filter.category
    if (filter.isActive !== undefined) where['isActive'] = filter.isActive

    const [data, total] = await Promise.all([
      db.vendor.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.vendor.count({ where }),
    ])

    return {
      data,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const vendor = await db.vendor.findFirst({ where: { id } })
    if (!vendor) throw new NotFoundException('Tedarikçi bulunamadı')
    return vendor
  }

  async update(id: string, dto: UpdateVendorDto, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.vendor.update({ where: { id }, data: dto })
  }

  async delete(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.vendor.update({ where: { id }, data: { isActive: false } })
  }
}
