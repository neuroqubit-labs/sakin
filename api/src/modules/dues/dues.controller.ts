import { Controller, Get, Post, Patch, Param, Body, Query, UsePipes, ForbiddenException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { DuesService } from './dues.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { TenantContext } from '@sakin/shared'
import {
  GenerateDuesSchema,
  DuesFilterSchema,
  UpdateDuesSchema,
  UserRole,
  WaiveDuesSchema,
  DuesPolicyFilterSchema,
  CreateDuesPolicySchema,
  UpdateDuesPolicySchema,
  OpenDuesPeriodSchema,
  CloseDuesPeriodSchema,
} from '@sakin/shared'

@ApiTags('dues')
@ApiBearerAuth()
@Controller('dues')
export class DuesController {
  constructor(private readonly duesService: DuesService) {}

  private getTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    return ctx.tenantId
  }

  @Post('generate')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Siteye toplu aidat oluştur (TENANT_ADMIN)' })
  @UsePipes(new ZodValidationPipe(GenerateDuesSchema))
  async generate(@Body() dto: unknown, @Tenant() ctx: TenantContext) {
    return this.duesService.generate(
      dto as Parameters<DuesService['generate']>[0],
      this.getTenantId(ctx),
      ctx.userId,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Aidat listesi. RESIDENT: yalnızca kendi dairesini görür.' })
  async findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = DuesFilterSchema.parse(query)
    return this.duesService.findAll(filter, this.getTenantId(ctx), ctx.unitId ?? undefined)
  }

  @Get('policies')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Aidat policy listesi (TENANT_ADMIN)' })
  async listPolicies(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = DuesPolicyFilterSchema.parse(query)
    return this.duesService.listPolicies(filter, this.getTenantId(ctx))
  }

  @Post('policies')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Aidat policy olustur (TENANT_ADMIN)' })
  async createPolicy(@Body() body: unknown, @Tenant() ctx: TenantContext) {
    const dto = CreateDuesPolicySchema.parse(body)
    return this.duesService.createPolicy(dto, this.getTenantId(ctx))
  }

  @Patch('policies/:id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Aidat policy guncelle (TENANT_ADMIN)' })
  async updatePolicy(@Param('id') id: string, @Body() body: unknown, @Tenant() ctx: TenantContext) {
    const dto = UpdateDuesPolicySchema.parse(body)
    return this.duesService.updatePolicy(id, dto, this.getTenantId(ctx))
  }

  @Post('period/open')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Donem ac (TENANT_ADMIN)' })
  async openPeriod(@Body() body: unknown, @Tenant() ctx: TenantContext) {
    const dto = OpenDuesPeriodSchema.parse(body)
    return this.duesService.openPeriod(dto, this.getTenantId(ctx), ctx.userId)
  }

  @Post('period/close')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Donem kapat (TENANT_ADMIN)' })
  async closePeriod(@Body() body: unknown, @Tenant() ctx: TenantContext) {
    const dto = CloseDuesPeriodSchema.parse(body)
    return this.duesService.closePeriod(dto, this.getTenantId(ctx))
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Aidat detayı. RESIDENT: yalnızca kendi dairesine ait kaydı görebilir.' })
  async findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.duesService.findOne(id, this.getTenantId(ctx), ctx.unitId ?? undefined)
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Aidat güncelle (TENANT_ADMIN)' })
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    const dto = UpdateDuesSchema.parse(body)
    return this.duesService.update(id, dto, this.getTenantId(ctx), ctx.userId)
  }

  @Post(':id/waive')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Aidat sil/affet (WAIVED)' })
  async waive(@Param('id') id: string, @Body() body: unknown, @Tenant() ctx: TenantContext) {
    const dto = WaiveDuesSchema.parse(body)
    return this.duesService.waive(id, dto, this.getTenantId(ctx), ctx.userId)
  }

  @Post('mark-overdue')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Vadesi geçmiş aidatları OVERDUE yap (TENANT_ADMIN)' })
  async markOverdue(@Tenant() ctx: TenantContext) {
    return this.duesService.markOverdue(this.getTenantId(ctx))
  }
}
