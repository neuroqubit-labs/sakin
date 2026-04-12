import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AnnouncementService } from './announcement.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { CreateAnnouncementSchema, UpdateAnnouncementSchema, AnnouncementFilterSchema, UserRole } from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@ApiTags('announcements')
@ApiBearerAuth()
@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Duyuru oluştur (TENANT_ADMIN, STAFF)' })
  create(
    @Body(new ZodValidationPipe(CreateAnnouncementSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.announcementService.create(
      dto as Parameters<AnnouncementService['create']>[0],
      ctx.tenantId!,
      ctx.userId,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Duyuru listesi (TENANT_ADMIN, STAFF)' })
  findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = AnnouncementFilterSchema.parse(query)
    return this.announcementService.findAll(filter, ctx.tenantId!)
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Duyuru detayı (TENANT_ADMIN, STAFF)' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.announcementService.findOne(id, ctx.tenantId!)
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Duyuru güncelle (TENANT_ADMIN, STAFF)' })
  update(@Param('id') id: string, @Body() body: unknown, @Tenant() ctx: TenantContext) {
    const dto = UpdateAnnouncementSchema.parse(body)
    return this.announcementService.update(id, dto, ctx.tenantId!)
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Duyuru sil (TENANT_ADMIN)' })
  delete(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.announcementService.delete(id, ctx.tenantId!)
  }
}
