import { Controller, Get, Post, Patch, Param, Body, ForbiddenException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { SiteService } from './site.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { TenantContext } from '@sakin/shared'
import { CreateSiteSchema, UpdateSiteSchema, UserRole } from '@sakin/shared'
import { UsePipes } from '@nestjs/common'

@ApiTags('sites')
@ApiBearerAuth()
@Controller('sites')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  private getTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    return ctx.tenantId
  }

  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Yeni site oluştur (TENANT_ADMIN)' })
  @UsePipes(new ZodValidationPipe(CreateSiteSchema))
  create(@Body() dto: unknown, @Tenant() ctx: TenantContext) {
    return this.siteService.create(dto as Parameters<SiteService['create']>[0], this.getTenantId(ctx))
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Site listesi (TENANT_ADMIN, STAFF)' })
  findAll(@Tenant() ctx: TenantContext) {
    return this.siteService.findAll(this.getTenantId(ctx))
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Site detayı (TENANT_ADMIN, STAFF)' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.siteService.findOne(id, this.getTenantId(ctx))
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Site güncelle (TENANT_ADMIN)' })
  update(@Param('id') id: string, @Body() body: unknown, @Tenant() ctx: TenantContext) {
    const dto = UpdateSiteSchema.parse(body)
    return this.siteService.update(id, dto, this.getTenantId(ctx))
  }
}
