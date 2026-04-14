import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateDocumentDto, DocumentFilterDto } from '@sakin/shared'

@Injectable()
export class DocumentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDocumentDto, tenantId: string, userId?: string) {
    const db = this.prisma.forTenant(tenantId)
    return db.document.create({
      data: { ...dto, tenantId, uploadedById: userId ?? null },
    })
  }

  async findAll(filter: DocumentFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const where: Record<string, unknown> = { deletedAt: null }
    if (filter.ownerType) where['ownerType'] = filter.ownerType
    if (filter.ownerId) where['ownerId'] = filter.ownerId
    if (filter.type) where['type'] = filter.type

    const [data, total] = await Promise.all([
      db.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.document.count({ where }),
    ])

    return {
      data,
      meta: { total, page: filter.page, limit: filter.limit, totalPages: Math.ceil(total / filter.limit) },
    }
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const doc = await db.document.findFirst({ where: { id, deletedAt: null } })
    if (!doc) throw new NotFoundException('Belge bulunamadı')
    return doc
  }

  async delete(id: string, tenantId: string) {
    await this.findOne(id, tenantId)
    const db = this.prisma.forTenant(tenantId)
    return db.document.update({ where: { id }, data: { deletedAt: new Date() } })
  }
}
