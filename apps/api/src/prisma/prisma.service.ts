import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@sakin/database'

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

  /**
   * Tüm sorguları belirli bir tenant ile kısıtlayan genişletilmiş istemci döndürür.
   * Prisma Client Extensions kullanır — Prisma 5+ uyumlu, type-safe.
   *
   * Kullanım:
   *   const db = this.prisma.forTenant(tenantId)
   *   await db.site.findMany()  // otomatik WHERE tenantId = ?
   */
  forTenant(tenantId: string) {
    return this.$extends({
      query: {
        $allModels: {
          async findMany({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
            args['where'] = { ...((args['where'] as Record<string, unknown>) ?? {}), tenantId }
            return query(args)
          },
          async findFirst({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
            args['where'] = { ...((args['where'] as Record<string, unknown>) ?? {}), tenantId }
            return query(args)
          },
          async findUnique({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
            args['where'] = { ...((args['where'] as Record<string, unknown>) ?? {}), tenantId }
            return query(args)
          },
          async count({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
            args['where'] = { ...((args['where'] as Record<string, unknown>) ?? {}), tenantId }
            return query(args)
          },
          async create({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
            const data = args['data'] as Record<string, unknown>
            args['data'] = { ...data, tenantId }
            return query(args)
          },
          async createMany({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
            const data = args['data'] as Record<string, unknown>[]
            args['data'] = data.map((item) => ({ ...item, tenantId }))
            return query(args)
          },
          async update({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
            args['where'] = { ...((args['where'] as Record<string, unknown>) ?? {}), tenantId }
            return query(args)
          },
          async updateMany({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
            args['where'] = { ...((args['where'] as Record<string, unknown>) ?? {}), tenantId }
            return query(args)
          },
          async delete({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
            args['where'] = { ...((args['where'] as Record<string, unknown>) ?? {}), tenantId }
            return query(args)
          },
          async deleteMany({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
            args['where'] = { ...((args['where'] as Record<string, unknown>) ?? {}), tenantId }
            return query(args)
          },
        },
      },
    })
  }
}
