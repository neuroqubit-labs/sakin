import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateContractDto, UpdateContractDto, ContractFilterDto } from '@sakin/shared'

@Injectable()
export class ContractService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContractDto, tenantId: string, userId?: string) {
    const db = this.prisma.forTenant(tenantId)
    const site = await db.site.findFirst({ where: { id: dto.siteId } })
    if (!site) throw new NotFoundException('Site bulunamadı')
    return db.contract.create({
      data: { ...dto, tenantId, createdById: userId ?? null },
      include: {
        site: { select: { name: true } },
        vendor: { select: { name: true } },
      },
    })
  }

  async findAll(filter: ContractFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = { deletedAt: null }
    if (filter.siteId) where['siteId'] = filter.siteId
    if (filter.vendorId) where['vendorId'] = filter.vendorId
    if (filter.status) where['status'] = filter.status

    const [data, total] = await Promise.all([
      db.contract.findMany({
        where,
        include: {
          site: { select: { name: true } },
          vendor: { select: { name: true } },
        },
        orderBy: { endDate: 'asc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.contract.count({ where }),
    ])

    return {
      data,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const contract = await db.contract.findFirst({
      where: { id, deletedAt: null },
      include: {
        site: { select: { name: true } },
        vendor: { select: { name: true } },
      },
    })
    if (!contract) throw new NotFoundException('Sözleşme bulunamadı')
    return contract
  }

  async update(id: string, dto: UpdateContractDto, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.contract.update({
      where: { id },
      data: dto,
      include: {
        site: { select: { name: true } },
        vendor: { select: { name: true } },
      },
    })
  }

  async delete(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.contract.update({ where: { id }, data: { deletedAt: new Date() } })
  }
}
