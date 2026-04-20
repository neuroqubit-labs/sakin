import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req, Res } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { PlatformService } from './platform.service'
import { TenantManagementService } from './tenant-management.service'
import { PlatformAuditLogService } from './audit-log.service'
import { PlatformReportsService } from './reports.service'
import { PlatformSettingsService } from './platform-settings.service'
import { PlatformGuard } from '../../common/guards/platform.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { Tenant } from '../../common/decorators/tenant.decorator'
import type { TenantContext } from '@sakin/shared'
import {
  CreateTenantSchema,
  UpdateTenantSchema,
  UpdateTenantPlanSchema,
  SuspendTenantSchema,
  TenantFilterSchema,
  PlatformAuditFilterSchema,
  PlatformReportFilterSchema,
  PlatformSettingsSchema,
} from '@sakin/shared'

interface FastifyLike {
  ip?: string
  headers?: Record<string, string | string[] | undefined>
}

function extractActorMeta(ctx: TenantContext, req: FastifyLike) {
  const ua = req.headers?.['user-agent']
  return {
    userId: ctx.userId,
    ipAddress: req.ip ?? null,
    userAgent: typeof ua === 'string' ? ua : Array.isArray(ua) ? ua[0] ?? null : null,
  }
}

@ApiTags('platform')
@ApiBearerAuth()
@UseGuards(PlatformGuard)
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly tenantManagement: TenantManagementService,
    private readonly auditLog: PlatformAuditLogService,
    private readonly reports: PlatformReportsService,
    private readonly settings: PlatformSettingsService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform geneli istatistikler (SUPER_ADMIN)' })
  getStats() {
    return this.platformService.getStats()
  }

  @Get('plans/summary')
  @ApiOperation({ summary: 'Plan bazlı tenant, SMS ve daire toplamları' })
  getPlanSummary() {
    return this.platformService.getPlanSummary()
  }

  // ── Tenant Yönetimi ─────────────────────────────────────────────

  @Get('tenants')
  @ApiOperation({ summary: 'Tüm tenant listesi' })
  findAllTenants(@Query() query: unknown) {
    const filter = TenantFilterSchema.parse(query)
    return this.tenantManagement.findAll(filter)
  }

  @Post('tenants')
  @ApiOperation({ summary: 'Yeni tenant + TRIAL plan + ilk TENANT_ADMIN oluştur' })
  createTenant(
    @Body(new ZodValidationPipe(CreateTenantSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
    @Req() req: FastifyLike,
  ) {
    return this.tenantManagement.create(
      dto as Parameters<TenantManagementService['create']>[0],
      extractActorMeta(ctx, req),
    )
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Tenant detayı + istatistikler' })
  findOneTenant(@Param('id') id: string) {
    return this.tenantManagement.findOne(id)
  }

  @Patch('tenants/:id')
  @ApiOperation({ summary: 'Tenant iletişim bilgisi / aktivite notları güncelle' })
  updateTenant(
    @Param('id') id: string,
    @Body() body: unknown,
    @Tenant() ctx: TenantContext,
    @Req() req: FastifyLike,
  ) {
    const dto = UpdateTenantSchema.parse(body)
    return this.tenantManagement.update(id, dto, extractActorMeta(ctx, req))
  }

  @Post('tenants/:id/activate')
  @ApiOperation({ summary: 'Tenant aktifleştir (askıya almayı kaldırır)' })
  activateTenant(@Param('id') id: string, @Tenant() ctx: TenantContext, @Req() req: FastifyLike) {
    return this.tenantManagement.activate(id, extractActorMeta(ctx, req))
  }

  @Post('tenants/:id/deactivate')
  @ApiOperation({ summary: "Tenant'ı askıya al (sebep zorunlu)" })
  deactivateTenant(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SuspendTenantSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
    @Req() req: FastifyLike,
  ) {
    return this.tenantManagement.deactivate(
      id,
      dto as Parameters<TenantManagementService['deactivate']>[1],
      extractActorMeta(ctx, req),
    )
  }

  @Patch('tenants/:id/plan')
  @ApiOperation({ summary: 'Tenant planını güncelle (SMS kredisi, plan tipi, bitiş tarihi)' })
  updatePlan(
    @Param('id') id: string,
    @Body() body: unknown,
    @Tenant() ctx: TenantContext,
    @Req() req: FastifyLike,
  ) {
    const dto = UpdateTenantPlanSchema.parse(body)
    return this.tenantManagement.updatePlan(id, dto, extractActorMeta(ctx, req))
  }

  // ── Audit Logs ──────────────────────────────────────────────────

  @Get('audit-logs')
  @ApiOperation({ summary: 'Platform işlem geçmişi (tenant yönetim aksiyonları)' })
  listAuditLogs(@Query() query: unknown) {
    const filter = PlatformAuditFilterSchema.parse(query)
    return this.auditLog.list(filter)
  }

  // ── Sistem Ayarları ─────────────────────────────────────────────

  @Get('settings')
  @ApiOperation({ summary: 'Platform geneli sistem ayarları' })
  getSettings() {
    return this.settings.getAll()
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Platform geneli sistem ayarlarını güncelle' })
  async updateSettings(
    @Body() body: unknown,
    @Tenant() ctx: TenantContext,
    @Req() req: FastifyLike,
  ) {
    const dto = PlatformSettingsSchema.parse(body)
    const result = await this.settings.update(dto, ctx.userId)
    const meta = extractActorMeta(ctx, req)
    await this.auditLog
      .write({
        actorUserId: ctx.userId,
        tenantId: null,
        action: 'PLATFORM_SETTING_UPDATED',
        entity: 'PlatformSetting',
        entityId: 'platform',
        changes: dto as Record<string, unknown>,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      })
      .catch(() => null)
    return result
  }

  // ── Raporlar ─────────────────────────────────────────────────────

  @Get('reports/tenant-status')
  @ApiOperation({ summary: 'Firma durum raporu (site/daire/kullanıcı/aidat/tahsilat)' })
  reportTenantStatus(@Query() query: unknown) {
    return this.reports.tenantStatus(PlatformReportFilterSchema.parse(query))
  }

  @Get('reports/license')
  @ApiOperation({ summary: 'Lisans raporu (plan + kalan gün + durum)' })
  reportLicense(@Query() query: unknown) {
    return this.reports.license(PlatformReportFilterSchema.parse(query))
  }

  @Get('reports/sms-usage')
  @ApiOperation({ summary: 'SMS kullanım raporu (tenant + kanal + durum bazlı)' })
  reportSmsUsage(@Query() query: unknown) {
    return this.reports.smsUsage(PlatformReportFilterSchema.parse(query))
  }

  @Get('reports/system-activity')
  @ApiOperation({ summary: 'Sistem aktivite raporu (audit özet + son 100)' })
  reportSystemActivity(@Query() query: unknown) {
    return this.reports.systemActivity(PlatformReportFilterSchema.parse(query))
  }

  @Get('reports/health-errors')
  @ApiOperation({ summary: 'Hata ve sağlık raporu' })
  reportHealthErrors(@Query() query: unknown) {
    return this.reports.healthErrors(PlatformReportFilterSchema.parse(query))
  }

  @Get('reports/:type/export.csv')
  @ApiOperation({ summary: 'Rapor CSV export' })
  async exportReport(
    @Param('type') type: string,
    @Query() query: unknown,
    @Res({ passthrough: false }) reply: FastifyReplyLike,
  ) {
    const filter = PlatformReportFilterSchema.parse(query)
    let rows: Array<Record<string, unknown>> = []

    switch (type) {
      case 'tenant-status':
        rows = await this.reports.tenantStatus(filter)
        break
      case 'license':
        rows = (await this.reports.license(filter)) as unknown as Array<Record<string, unknown>>
        break
      case 'sms-usage':
        rows = await this.reports.smsUsage(filter)
        break
      case 'system-activity': {
        const report = await this.reports.systemActivity(filter)
        rows = report.recent.map((r) => ({
          createdAt: r.createdAt.toISOString(),
          action: r.action,
          entity: r.entity,
          tenantName: r.tenantName ?? '',
          actorEmail: r.actor?.email ?? '',
          actorName: r.actor?.displayName ?? '',
          ipAddress: r.ipAddress ?? '',
        }))
        break
      }
      case 'health-errors': {
        const report = await this.reports.healthErrors(filter)
        rows = report.recentFailures.map((r) => ({
          createdAt: r.createdAt.toISOString(),
          tenantName: r.tenantName,
          channel: r.channel,
          recipient: r.recipient,
          error: r.error,
        }))
        break
      }
      default:
        rows = []
    }

    const csv = toCsv(rows)
    const filename = `${type}-${new Date().toISOString().slice(0, 10)}.csv`

    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="${filename}"`)
    reply.send(csv)
  }
}

interface FastifyReplyLike {
  header(name: string, value: string): void
  send(payload: string): void
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0] ?? {})
  const csvRows = rows.map((row) =>
    headers
      .map((header) => {
        const raw = row[header]
        const value =
          raw === null || raw === undefined
            ? ''
            : raw instanceof Date
              ? raw.toISOString()
              : String(raw)
        const escaped = value.replace(/"/g, '""')
        return `"${escaped}"`
      })
      .join(','),
  )
  return `${headers.join(',')}\n${csvRows.join('\n')}`
}
