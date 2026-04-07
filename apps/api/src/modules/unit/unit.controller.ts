import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { UnitService } from './unit.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { CreateUnitSchema, UpdateUnitSchema, UnitFilterSchema, CreateBlockSchema, UserRole } from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@ApiTags('units')
@ApiBearerAuth()
@Controller()
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Post('units')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Yeni daire oluştur (TENANT_ADMIN)' })
  create(
    @Body(new ZodValidationPipe(CreateUnitSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.unitService.create(
      dto as Parameters<UnitService['create']>[0],
      ctx.tenantId!,
    )
  }

  @Get('units')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Daire listesi (TENANT_ADMIN, STAFF)' })
  findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = UnitFilterSchema.parse(query)
    return this.unitService.findAll(filter, ctx.tenantId!)
  }

  @Get('units/:id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Daire detayı (TENANT_ADMIN, STAFF)' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.unitService.findOne(id, ctx.tenantId!)
  }

  @Patch('units/:id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Daire güncelle (TENANT_ADMIN)' })
  update(@Param('id') id: string, @Body() body: unknown, @Tenant() ctx: TenantContext) {
    const dto = UpdateUnitSchema.parse(body)
    return this.unitService.update(id, dto, ctx.tenantId!)
  }

  @Delete('units/:id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Daire pasife al (TENANT_ADMIN)' })
  softDelete(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.unitService.softDelete(id, ctx.tenantId!)
  }

  @Post('units/:id/activate')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Daire aktifleştir (TENANT_ADMIN)' })
  activate(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.unitService.activate(id, ctx.tenantId!)
  }

  // ── Block Routes ────────────────────────────────────────────────

  @Post('sites/:siteId/blocks')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Site içinde blok oluştur (TENANT_ADMIN)' })
  createBlock(
    @Param('siteId') siteId: string,
    @Body(new ZodValidationPipe(CreateBlockSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.unitService.createBlock(
      siteId,
      dto as Parameters<UnitService['createBlock']>[1],
      ctx.tenantId!,
    )
  }

  @Get('sites/:siteId/blocks')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Site blok listesi (TENANT_ADMIN, STAFF)' })
  findBlocks(@Param('siteId') siteId: string, @Tenant() ctx: TenantContext) {
    return this.unitService.findBlocks(siteId, ctx.tenantId!)
  }
}
