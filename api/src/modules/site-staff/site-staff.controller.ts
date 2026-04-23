import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { SiteStaffService } from './site-staff.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import {
  CreateSiteStaffSchema,
  UpdateSiteStaffSchema,
  SiteStaffFilterSchema,
  UserRole,
} from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@ApiTags('site-staff')
@ApiBearerAuth()
@Controller('site-staff')
export class SiteStaffController {
  constructor(private readonly siteStaffService: SiteStaffService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Bina personeli ekle (TENANT_ADMIN)' })
  create(
    @Body(new ZodValidationPipe(CreateSiteStaffSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.siteStaffService.create(
      dto as Parameters<SiteStaffService['create']>[0],
      ctx.tenantId!,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Bina personeli listele' })
  findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = SiteStaffFilterSchema.parse(query)
    return this.siteStaffService.findAll(filter, ctx.tenantId!)
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Personel detayı' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.siteStaffService.findOne(id, ctx.tenantId!)
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Personel güncelle (TENANT_ADMIN)' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSiteStaffSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.siteStaffService.update(
      id,
      dto as Parameters<SiteStaffService['update']>[1],
      ctx.tenantId!,
    )
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Personel pasife al (TENANT_ADMIN)' })
  delete(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.siteStaffService.delete(id, ctx.tenantId!)
  }
}
