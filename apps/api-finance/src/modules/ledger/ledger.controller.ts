import { Controller, Get, Query, BadRequestException } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { LedgerService } from './ledger.service'
import { Tenant, Roles } from '@sakin/api-core'
import type { TenantContext } from '@sakin/shared'
import { LedgerFilterSchema, UnitStatementSchema, UserRole } from '@sakin/shared'
import { PrismaService } from '../../prisma/prisma.service'

@ApiTags('ledger')
@ApiBearerAuth()
@Controller('ledger')
export class LedgerController {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('entries')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Ledger hareket listesi' })
  list(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = LedgerFilterSchema.parse(query)
    return this.ledgerService.list(filter, ctx.tenantId!)
  }

  @Get('unit-statement')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Daire ekstresi' })
  unitStatement(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const dto = UnitStatementSchema.parse(query)
    return this.ledgerService.getUnitStatement(dto, ctx.tenantId!, {
      userId: ctx.userId,
      role: ctx.role,
    })
  }

  @Get('collection-summary')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Tahsilat özeti' })
  collectionSummary(@Query('siteId') siteId: string | undefined, @Tenant() ctx: TenantContext) {
    return this.ledgerService.getTenantCollectionSummary(ctx.tenantId!, siteId)
  }

  @Get('unit-audit-log')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Daire bazlı işlem denetim kaydı' })
  async unitAuditLog(
    @Query('unitId') unitId: string | undefined,
    @Query('limit') limitRaw: string | undefined,
    @Tenant() ctx: TenantContext,
  ) {
    if (!unitId) throw new BadRequestException('unitId zorunludur')
    const tenantId = ctx.tenantId!
    const limit = Math.min(parseInt(limitRaw ?? '20', 10) || 20, 100)

    const db = this.prisma.forTenant(tenantId)

    // Collect payment IDs for this unit so we can find related audit entries
    const payments = await db.payment.findMany({
      where: { unitId },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    const paymentIds = payments.map((p) => p.id)

    const entries = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        entityId: paymentIds.length > 0 ? { in: paymentIds } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const userIds = [...new Set(entries.map((e) => e.userId))]
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, email: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    return entries.map((e) => {
      const u = userMap.get(e.userId)
      return {
        id: e.id,
        action: e.action,
        entity: e.entity,
        entityId: e.entityId,
        changes: e.changes,
        performedBy: u?.displayName ?? u?.email ?? 'Sistem',
        createdAt: e.createdAt,
      }
    })
  }
}
