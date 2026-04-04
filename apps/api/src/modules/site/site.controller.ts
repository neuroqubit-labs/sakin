import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { SiteService } from './site.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { TenantContext } from '@sakin/shared'
import { CreateSiteSchema, UpdateSiteSchema } from '@sakin/shared'
import { UsePipes } from '@nestjs/common'

@ApiTags('sites')
@ApiBearerAuth()
@Controller('sites')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Post()
  @ApiOperation({ summary: 'Yeni site oluştur' })
  @UsePipes(new ZodValidationPipe(CreateSiteSchema))
  create(@Body() dto: unknown, @Tenant() ctx: TenantContext) {
    return this.siteService.create(dto as Parameters<SiteService['create']>[0], ctx.tenantId)
  }

  @Get()
  @ApiOperation({ summary: 'Site listesi' })
  findAll(@Tenant() ctx: TenantContext) {
    return this.siteService.findAll(ctx.tenantId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Site detayı' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.siteService.findOne(id, ctx.tenantId)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Site güncelle' })
  update(@Param('id') id: string, @Body() body: unknown, @Tenant() ctx: TenantContext) {
    const dto = UpdateSiteSchema.parse(body)
    return this.siteService.update(id, dto, ctx.tenantId)
  }
}
