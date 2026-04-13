import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@sakin/database'

const TENANT_SCOPED_MODELS = new Set([
  'TenantPaymentGatewayConfig',
  'Site',
  'Block',
  'Unit',
  'Resident',
  'UnitOccupancy',
  'DuesDefinition',
  'Dues',
  'Payment',
  'PaymentAttempt',
  'PaymentProviderEvent',
  'LedgerEntry',
  'ExportBatch',
  'Notification',
  'Expense',
  'Announcement',
  'AuditLog',
  'CashAccount',
  'CashTransaction',
  'SiteStaff',
])

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }

  private addTenantToData(data: Record<string, unknown>, tenantId: string) {
    if ('tenantId' in data && data['tenantId'] && data['tenantId'] !== tenantId) {
      throw new Error('Tenant scoped write mismatch detected')
    }
    return { ...data, tenantId }
  }

  private addTenantToWhere(where: Record<string, unknown> | undefined, tenantId: string) {
    if (!where) return { tenantId }
    if ('tenantId' in where && where['tenantId'] && where['tenantId'] !== tenantId) {
      throw new Error('Tenant scoped query mismatch detected')
    }
    return { ...where, tenantId }
  }

  /**
   * Tenant kolonuna sahip modellerde sorguları güvenli şekilde tenant ile sınırlar.
   * Tenant kolonuna sahip olmayan global modellerde filtre enjekte etmez.
   */
  forTenant(tenantId: string) {
    const service = this
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({
            model,
            operation,
            args,
            query,
          }: {
            model?: string
            operation: string
            args: Record<string, unknown>
            query: (args: Record<string, unknown>) => Promise<unknown>
          }) {
            if (!model || !TENANT_SCOPED_MODELS.has(model)) {
              return query(args)
            }

            if (
              operation === 'findMany' ||
              operation === 'findFirst' ||
              operation === 'findUnique' ||
              operation === 'count' ||
              operation === 'aggregate' ||
              operation === 'groupBy' ||
              operation === 'updateMany' ||
              operation === 'deleteMany'
            ) {
              args['where'] = service.addTenantToWhere(
                args['where'] as Record<string, unknown>,
                tenantId,
              )
              return query(args)
            }

            if (operation === 'create') {
              args['data'] = service.addTenantToData(
                args['data'] as Record<string, unknown>,
                tenantId,
              )
              return query(args)
            }

            if (operation === 'createMany') {
              const payload = args['data']
              if (Array.isArray(payload)) {
                args['data'] = payload.map((item) =>
                  service.addTenantToData(item as Record<string, unknown>, tenantId),
                )
              }
              return query(args)
            }

            if (operation === 'update' || operation === 'delete' || operation === 'upsert') {
              args['where'] = service.addTenantToWhere(
                args['where'] as Record<string, unknown>,
                tenantId,
              )
            }

            if (operation === 'upsert') {
              args['create'] = service.addTenantToData(
                args['create'] as Record<string, unknown>,
                tenantId,
              )
            }

            return query(args)
          },
        },
      },
    })
  }
}
