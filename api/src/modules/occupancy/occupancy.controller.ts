import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  CreateOccupancySchema,
  OccupancyFilterSchema,
  UpdateOccupancySchema,
  UserRole,
  type TenantContext,
} from '@sakin/shared'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { OccupancyService } from './occupancy.service'

@ApiTags('occupancies')
@ApiBearerAuth()
@Controller('occupancies')
export class OccupancyController {
  constructor(private readonly occupancyService: OccupancyService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Daire-sakin ilişkisi oluştur' })
  create(
    @Body(new ZodValidationPipe(CreateOccupancySchema)) body: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.occupancyService.create(
      body as Parameters<OccupancyService['create']>[0],
      ctx.tenantId!,
      ctx.userId,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Daire-sakin ilişkileri listesi' })
  list(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = OccupancyFilterSchema.parse(query)
    return this.occupancyService.findAll(filter, ctx.tenantId!)
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Daire-sakin ilişkisi güncelle' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateOccupancySchema)) body: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.occupancyService.update(id, body as Parameters<OccupancyService['update']>[1], ctx.tenantId!)
  }

  @Post(':id/end')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Daire-sakin ilişkiyi sonlandır' })
  end(
    @Param('id') id: string,
    @Body('note') note: string | undefined,
    @Tenant() ctx: TenantContext,
  ) {
    return this.occupancyService.endOccupancy(id, ctx.tenantId!, note)
  }
}
