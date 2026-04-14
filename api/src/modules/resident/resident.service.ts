import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import {
  CreateResidentSchema,
  type CreateResidentDto,
  type UpdateResidentDto,
  type ResidentFilterDto,
  type ResidentExportFilterDto,
  type ResidentImportDryRunDto,
  type ResidentImportCommitDto,
  type ResidentBulkUpdateDto,
} from '@sakin/shared'

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
    const where = this.buildResidentWhere(filter)

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

  async importDryRun(dto: ResidentImportDryRunDto, tenantId: string) {
    const parsed = this.parseResidentsCsv(dto.csv)
    const prepared = this.prepareImportRows(parsed.rows)

    return {
      summary: {
        tenantId,
        totalRows: prepared.length,
        validRows: prepared.filter((row) => row.valid).length,
        invalidRows: prepared.filter((row) => !row.valid).length,
      },
      preview: prepared.slice(0, 200),
      exceededPreviewLimit: prepared.length > 200,
      headers: parsed.headers,
    }
  }

  async importCommit(dto: ResidentImportCommitDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const parsed = this.parseResidentsCsv(dto.csv)
    const prepared = this.prepareImportRows(parsed.rows)
    const validRows = prepared.filter((row) => row.valid && row.normalized)
    const invalidRows = prepared.filter((row) => !row.valid)

    let createdCount = 0
    const commitErrors: Array<{ rowIndex: number; message: string }> = []

    for (const row of validRows) {
      try {
        await db.resident.create({
          data: {
            ...row.normalized!,
            tenantId,
          },
        })
        createdCount += 1
      } catch (error) {
        commitErrors.push({
          rowIndex: row.rowIndex,
          message: error instanceof Error ? error.message : 'Kayit olusturulamadi',
        })
      }
    }

    const skippedInvalid = dto.skipInvalid ? invalidRows.length : 0
    const skippedFailed = commitErrors.length

    return {
      summary: {
        totalRows: prepared.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        createdCount,
        skippedCount: skippedInvalid + skippedFailed,
      },
      invalidRows: invalidRows.slice(0, 200),
      commitErrors: commitErrors.slice(0, 200),
    }
  }

  async bulkUpdate(dto: ResidentBulkUpdateDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const data: Record<string, unknown> = {}
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive
    if (dto.email !== undefined) data['email'] = dto.email
    if (dto.phoneNumber !== undefined) data['phoneNumber'] = dto.phoneNumber
    if (dto.type !== undefined) data['type'] = dto.type

    const result = await db.resident.updateMany({
      where: {
        id: { in: dto.residentIds },
      },
      data,
    })

    return {
      updatedCount: result.count,
      requestedCount: dto.residentIds.length,
    }
  }

  async exportCsv(filter: ResidentExportFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const where = this.buildResidentWhere(filter)

    const residents = await db.resident.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        occupancies: {
          where: { isActive: true },
          include: {
            unit: {
              select: {
                number: true,
                site: { select: { name: true } },
              },
            },
          },
          take: 1,
        },
      },
    })

    const header = ['firstName', 'lastName', 'email', 'phoneNumber', 'tckn', 'type', 'site', 'unit']
    const rows = residents.map((resident) => {
      const activeOccupancy = resident.occupancies[0]
      const site = activeOccupancy?.unit.site.name ?? ''
      const unit = activeOccupancy?.unit.number ?? ''

      return [
        this.csvEscape(resident.firstName),
        this.csvEscape(resident.lastName),
        this.csvEscape(resident.email ?? ''),
        this.csvEscape(resident.phoneNumber),
        this.csvEscape(resident.tckn ?? ''),
        this.csvEscape(resident.type),
        this.csvEscape(site),
        this.csvEscape(unit),
      ].join(',')
    })

    const csv = [header.join(','), ...rows].join('\n')

    return {
      fileName: `residents-export-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      total: residents.length,
    }
  }

  async findOne(id: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const resident = await db.resident.findFirst({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            createdAt: true,
          },
        },
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
          select: {
            id: true,
            amount: true,
            currency: true,
            method: true,
            status: true,
            paidAt: true,
            receiptNumber: true,
            createdAt: true,
          },
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

  private buildResidentWhere(filter: {
    unitId?: string
    siteId?: string
    type?: ResidentFilterDto['type']
    isActive?: boolean
    search?: string
  }) {
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
    return where
  }

  private parseResidentsCsv(csv: string) {
    const lines = csv
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    if (lines.length === 0) {
      throw new BadRequestException('CSV bos olamaz')
    }

    const delimiter = lines[0]?.includes(';') ? ';' : ','
    const headers = this.parseCsvLine(lines[0] ?? '', delimiter).map((h) => h.trim())
    const rows = lines.slice(1).map((line, index) => {
      const columns = this.parseCsvLine(line, delimiter)
      const mapped: Record<string, string> = {}
      headers.forEach((header, headerIndex) => {
        mapped[header] = (columns[headerIndex] ?? '').trim()
      })
      return {
        rowIndex: index + 2,
        raw: line,
        data: mapped,
      }
    })

    return { headers, rows }
  }

  private prepareImportRows(rows: Array<{ rowIndex: number; raw: string; data: Record<string, string> }>) {
    return rows.map((row) => {
      const candidate = {
        firstName: this.pickValue(row.data, ['firstName', 'ad']),
        lastName: this.pickValue(row.data, ['lastName', 'soyad']),
        email: this.pickValue(row.data, ['email']) || undefined,
        phoneNumber: this.pickValue(row.data, ['phoneNumber', 'telefon']),
        tckn: this.pickValue(row.data, ['tckn']) || undefined,
        type: this.pickValue(row.data, ['type', 'tip'])?.toUpperCase(),
      }

      const parsed = CreateResidentSchema.safeParse(candidate)
      if (!parsed.success) {
        return {
          rowIndex: row.rowIndex,
          raw: row.raw,
          valid: false,
          normalized: null,
          errors: parsed.error.issues.map((issue) => issue.message),
        }
      }

      return {
        rowIndex: row.rowIndex,
        raw: row.raw,
        valid: true,
        normalized: parsed.data,
        errors: [] as string[],
      }
    })
  }

  private pickValue(source: Record<string, string>, keys: string[]) {
    for (const key of keys) {
      if (source[key] !== undefined) {
        return source[key]
      }
    }
    return ''
  }

  private parseCsvLine(line: string, delimiter: string) {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = !inQuotes
        }
        continue
      }

      if (ch === delimiter && !inQuotes) {
        result.push(current)
        current = ''
        continue
      }

      current += ch
    }

    result.push(current)
    return result
  }

  private csvEscape(value: string) {
    const escaped = value.replace(/"/g, '""')
    return `"${escaped}"`
  }
}
