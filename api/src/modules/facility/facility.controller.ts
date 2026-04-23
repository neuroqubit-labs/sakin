import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { FacilityService } from './facility.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import {
  CreateFacilitySchema,
  UpdateFacilitySchema,
  FacilityFilterSchema,
  UserRole,
} from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@ApiTags('facilities')
@ApiBearerAuth()
@Controller('facilities')
export class FacilityController {
  constructor(private readonly facilityService: FacilityService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Tesis ekle' })
  create(
    @Body(new ZodValidationPipe(CreateFacilitySchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.facilityService.create(
      dto as Parameters<FacilityService['create']>[0],
      ctx.tenantId!,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Tesis listele' })
  findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = FacilityFilterSchema.parse(query)
    return this.facilityService.findAll(filter, ctx.tenantId!)
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Tesis detayı' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.facilityService.findOne(id, ctx.tenantId!)
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Tesis güncelle' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateFacilitySchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.facilityService.update(
      id,
      dto as Parameters<FacilityService['update']>[1],
      ctx.tenantId!,
    )
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Tesis pasife al' })
  delete(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.facilityService.delete(id, ctx.tenantId!)
  }
}
