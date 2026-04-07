import { Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@sakin/database'
import { PrismaService } from '../../prisma/prisma.service'
import {
  ExportStatus,
  ExportType,
  LedgerEntryType,
  LedgerReferenceType,
  PaymentMethod,
  PaymentStatus,
  type CreateExportBatchDto,
  type ExportBatchFilterDto,
} from '@sakin/shared'
import { AUDIT_ACTIONS } from '../../common/audit/audit-actions'

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async createBatch(dto: CreateExportBatchDto, tenantId: string, userId: string) {
    const db = this.prisma.forTenant(tenantId)
    const normalizedFilters = this.normalizeFilters(dto.type, dto.filters ?? {})
    const startedAt = new Date()

    const batch = await db.exportBatch.create({
      data: {
        tenantId,
        type: dto.type,
        status: ExportStatus.PROCESSING,
        filters: normalizedFilters as Prisma.InputJsonValue,
        requestedByUserId: userId,
      },
    })

    await db.auditLog.create({
      data: {
        tenantId,
        userId,
        action: AUDIT_ACTIONS.EXPORT_BATCH_CREATED,
        entity: 'ExportBatch',
        entityId: batch.id,
        metadata: {
          type: dto.type,
          filters: normalizedFilters,
        },
      },
    })

    const rows = await this.generateRows(dto.type, tenantId, normalizedFilters)
    const reconciliation = await this.reconcileBatch(dto.type, tenantId, normalizedFilters)
    const rowCount = rows.length
    const completedAt = new Date()

    const batchFiltersWithMeta = {
      ...normalizedFilters,
      _meta: {
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        rowCount,
      },
      ...(reconciliation ? { _reconciliation: reconciliation } : {}),
    }

    // dev note: S3/object storage pipeline henüz eklenmedi | hedef: M2-export-storage | etki: Büyük export dosyaları API memory footprint artırabilir. backlog: SKN-324
    await db.exportBatch.update({
      where: { id: batch.id },
      data: {
        status: ExportStatus.COMPLETED,
        rowCount,
        completedAt,
        filters: batchFiltersWithMeta as Prisma.InputJsonValue,
      },
    })

    await db.auditLog.create({
      data: {
        tenantId,
        userId,
        action: AUDIT_ACTIONS.EXPORT_BATCH_COMPLETED,
        entity: 'ExportBatch',
        entityId: batch.id,
        metadata: {
          rowCount,
          reconciliation,
        },
      },
    })

    return {
      ...batch,
      status: ExportStatus.COMPLETED,
      rowCount,
      completedAt,
      filters: batchFiltersWithMeta,
      reconciliation,
    }
  }

  async listBatches(filter: ExportBatchFilterDto, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)
    const where: Prisma.ExportBatchWhereInput = {}

    if (filter.type) where['type'] = filter.type
    if (filter.status) where['status'] = filter.status

    const [data, total] = await Promise.all([
      db.exportBatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      db.exportBatch.count({ where }),
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

  async renderCsv(batchId: string, tenantId: string) {
    const db = this.prisma.forTenant(tenantId)

    const batch = await db.exportBatch.findFirst({ where: { id: batchId } })
    if (!batch) throw new NotFoundException('Export batch bulunamadı')

    const rows = await this.generateRows(
      batch.type as ExportType,
      tenantId,
      (batch.filters as Record<string, unknown> | null) ?? {},
    )

    return {
      filename: `export-${batch.type.toLowerCase()}-${batch.id}.csv`,
      csv: this.toCsv(rows),
      rowCount: rows.length,
    }
  }

  private normalizeFilters(type: ExportType, filters: Record<string, unknown>): Record<string, unknown> {
    if (type !== ExportType.COLLECTIONS) {
      return filters
    }

    const normalized: Record<string, unknown> = {}
    if (typeof filters['siteId'] === 'string' && filters['siteId'].length > 0) {
      normalized.siteId = filters['siteId']
    }

    if (
      typeof filters['status'] === 'string' &&
      Object.values(PaymentStatus).includes(filters['status'] as PaymentStatus)
    ) {
      normalized.status = filters['status'] as PaymentStatus
    }

    if (
      typeof filters['method'] === 'string' &&
      Object.values(PaymentMethod).includes(filters['method'] as PaymentMethod)
    ) {
      normalized.method = filters['method'] as PaymentMethod
    }

    if (filters['dateFrom']) {
      const parsed = new Date(String(filters['dateFrom']))
      if (!Number.isNaN(parsed.getTime())) normalized.dateFrom = parsed.toISOString()
    }

    if (filters['dateTo']) {
      const parsed = new Date(String(filters['dateTo']))
      if (!Number.isNaN(parsed.getTime())) normalized.dateTo = parsed.toISOString()
    }

    return normalized
  }

  private toCollectionsWhere(filters: Record<string, unknown>): Prisma.PaymentWhereInput {
    const where: Prisma.PaymentWhereInput = {}
    if (filters['siteId']) {
      where.unit = { siteId: String(filters['siteId']) }
    }
    if (filters['status']) {
      where.status = filters['status'] as PaymentStatus
    }
    if (filters['method']) {
      where.method = filters['method'] as PaymentMethod
    }
    if (filters['dateFrom'] || filters['dateTo']) {
      where.paidAt = {
        ...(filters['dateFrom'] ? { gte: new Date(String(filters['dateFrom'])) } : {}),
        ...(filters['dateTo'] ? { lte: new Date(String(filters['dateTo'])) } : {}),
      }
    }
    return where
  }

  private async reconcileBatch(
    type: ExportType,
    tenantId: string,
    filters: Record<string, unknown>,
  ) {
    if (type !== ExportType.COLLECTIONS) {
      return null
    }

    const db = this.prisma.forTenant(tenantId)
    const paymentWhere = this.toCollectionsWhere(filters)

    const confirmedPayments = await db.payment.findMany({
      where: {
        ...paymentWhere,
        status: PaymentStatus.CONFIRMED,
      },
      select: { id: true, amount: true },
    })

    const paymentIds = confirmedPayments.map((payment) => payment.id)
    const paymentTotal = confirmedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)

    const ledgerRows =
      paymentIds.length > 0
        ? await db.ledgerEntry.groupBy({
            by: ['entryType'],
            where: {
              tenantId,
              referenceType: LedgerReferenceType.PAYMENT,
              referenceId: { in: paymentIds },
              entryType: { in: [LedgerEntryType.PAYMENT, LedgerEntryType.REFUND] },
            },
            _sum: { amount: true },
          })
        : []

    let ledgerPayments = 0
    let ledgerRefunds = 0
    for (const row of ledgerRows) {
      if (row.entryType === LedgerEntryType.PAYMENT) {
        ledgerPayments = Math.abs(Number(row._sum.amount ?? 0))
      }
      if (row.entryType === LedgerEntryType.REFUND) {
        ledgerRefunds = Math.abs(Number(row._sum.amount ?? 0))
      }
    }

    const ledgerNet = Math.max(0, ledgerPayments - ledgerRefunds)
    const diff = Math.abs(paymentTotal - ledgerNet)

    return {
      paymentTotal: Number(paymentTotal.toFixed(2)),
      ledgerNet: Number(ledgerNet.toFixed(2)),
      diff: Number(diff.toFixed(2)),
      matched: diff < 0.01,
    }
  }

  private async generateRows(type: ExportType, tenantId: string, filters: Record<string, unknown>) {
    const db = this.prisma.forTenant(tenantId)

    if (type === ExportType.COLLECTIONS) {
      const where = this.toCollectionsWhere(filters)

      const payments = await db.payment.findMany({
        where,
        include: {
          unit: { include: { site: true } },
          paidByResident: true,
        },
        orderBy: { paidAt: 'desc' },
      })

      return payments.map((payment) => ({
        date: payment.paidAt?.toISOString() ?? '',
        transactionRef: payment.id,
        site: payment.unit.site.name,
        unit: payment.unit.number,
        resident:
          payment.paidByResident
            ? `${payment.paidByResident.firstName} ${payment.paidByResident.lastName}`
            : '',
        method: payment.method,
        channel: payment.channel,
        amount: Number(payment.amount).toFixed(2),
        status: payment.status,
        note: payment.note ?? '',
      }))
    }

    if (type === ExportType.DUES) {
      const dues = await db.dues.findMany({
        include: {
          unit: { include: { site: true } },
        },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      })

      return dues.map((row) => ({
        period: `${row.periodMonth}/${row.periodYear}`,
        site: row.unit.site.name,
        unit: row.unit.number,
        amount: Number(row.amount).toFixed(2),
        status: row.status,
        dueDate: row.dueDate.toISOString(),
        description: row.description ?? '',
      }))
    }

    const ledger = await db.ledgerEntry.findMany({
      include: {
        unit: { include: { site: true } },
      },
      orderBy: { effectiveAt: 'desc' },
    })

    return ledger.map((row) => ({
      date: row.effectiveAt.toISOString(),
      site: row.unit.site.name,
      unit: row.unit.number,
      entryType: row.entryType,
      amount: Number(row.amount).toFixed(2),
      currency: row.currency,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      note: row.note ?? '',
    }))
  }

  private toCsv(rows: Array<Record<string, unknown>>) {
    if (rows.length === 0) return ''

    const headers = Object.keys(rows[0] ?? {})
    const csvRows = rows.map((row) =>
      headers
        .map((header) => {
          const raw = row[header]
          const value = raw === null || raw === undefined ? '' : String(raw)
          const escaped = value.replace(/"/g, '""')
          return `"${escaped}"`
        })
        .join(','),
    )

    return `${headers.join(',')}\n${csvRows.join('\n')}`
  }
}
