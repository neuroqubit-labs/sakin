import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { VendorService } from './vendor.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import {
  CreateVendorSchema,
  UpdateVendorSchema,
  VendorFilterSchema,
  UserRole,
} from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@ApiTags('vendors')
@ApiBearerAuth()
@Controller('vendors')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Tedarikçi ekle' })
  create(
    @Body(new ZodValidationPipe(CreateVendorSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.vendorService.create(
      dto as Parameters<VendorService['create']>[0],
      ctx.tenantId!,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Tedarikçi listele' })
  findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = VendorFilterSchema.parse(query)
    return this.vendorService.findAll(filter, ctx.tenantId!)
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Tedarikçi detayı' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.vendorService.findOne(id, ctx.tenantId!)
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Tedarikçi güncelle' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateVendorSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.vendorService.update(
      id,
      dto as Parameters<VendorService['update']>[1],
      ctx.tenantId!,
    )
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Tedarikçi pasife al' })
  delete(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.vendorService.delete(id, ctx.tenantId!)
  }
}
