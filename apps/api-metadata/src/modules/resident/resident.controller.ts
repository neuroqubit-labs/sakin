import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ResidentService } from './resident.service'
import { Tenant, Roles } from '@sakin/api-core'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { CreateResidentSchema, UpdateResidentSchema, ResidentFilterSchema, UserRole } from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@ApiTags('residents')
@ApiBearerAuth()
@Controller('residents')
export class ResidentController {
  constructor(private readonly residentService: ResidentService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Yeni sakin oluştur (TENANT_ADMIN, STAFF)' })
  create(
    @Body(new ZodValidationPipe(CreateResidentSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.residentService.create(
      dto as Parameters<ResidentService['create']>[0],
      ctx.tenantId!,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Sakin listesi (TENANT_ADMIN, STAFF)' })
  findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = ResidentFilterSchema.parse(query)
    return this.residentService.findAll(filter, ctx.tenantId!)
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Sakin detayı (TENANT_ADMIN, STAFF)' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.residentService.findOne(id, ctx.tenantId!)
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Sakin bilgisi güncelle (TENANT_ADMIN, STAFF)' })
  update(@Param('id') id: string, @Body() body: unknown, @Tenant() ctx: TenantContext) {
    const dto = UpdateResidentSchema.parse(body)
    return this.residentService.update(id, dto, ctx.tenantId!)
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Sakin pasife al (TENANT_ADMIN)' })
  softDelete(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.residentService.softDelete(id, ctx.tenantId!)
  }

  @Post(':id/link-user')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Sakini Firebase kullanıcısına bağla (TENANT_ADMIN)' })
  linkUser(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Tenant() ctx: TenantContext,
  ) {
    return this.residentService.linkUser(id, userId, ctx.tenantId!)
  }
}
