import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { PlatformService } from './platform.service'
import { TenantManagementService } from './tenant-management.service'
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
} from '@sakin/shared'

@ApiTags('platform')
@ApiBearerAuth()
@UseGuards(PlatformGuard)
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly tenantManagement: TenantManagementService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform geneli istatistikler (SUPER_ADMIN)' })
  getStats() {
    return this.platformService.getStats()
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
  createTenant(@Body(new ZodValidationPipe(CreateTenantSchema)) dto: unknown) {
    return this.tenantManagement.create(dto as Parameters<TenantManagementService['create']>[0])
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Tenant detayı + istatistikler' })
  findOneTenant(@Param('id') id: string) {
    return this.tenantManagement.findOne(id)
  }

  @Patch('tenants/:id')
  @ApiOperation({ summary: 'Tenant iletişim bilgisi / aktivite notları güncelle' })
  updateTenant(@Param('id') id: string, @Body() body: unknown) {
    const dto = UpdateTenantSchema.parse(body)
    return this.tenantManagement.update(id, dto)
  }

  @Post('tenants/:id/activate')
  @ApiOperation({ summary: 'Tenant aktifleştir (askıya almayı kaldırır)' })
  activateTenant(@Param('id') id: string) {
    return this.tenantManagement.activate(id)
  }

  @Post('tenants/:id/deactivate')
  @ApiOperation({ summary: "Tenant'ı askıya al (sebep zorunlu)" })
  deactivateTenant(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SuspendTenantSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.tenantManagement.deactivate(
      id,
      dto as Parameters<TenantManagementService['deactivate']>[1],
      ctx.userId,
    )
  }

  @Patch('tenants/:id/plan')
  @ApiOperation({ summary: 'Tenant planını güncelle (SMS kredisi, plan tipi, bitiş tarihi)' })
  updatePlan(@Param('id') id: string, @Body() body: unknown) {
    const dto = UpdateTenantPlanSchema.parse(body)
    return this.tenantManagement.updatePlan(id, dto)
  }
}
