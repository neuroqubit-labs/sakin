import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ContractService } from './contract.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import {
  CreateContractSchema,
  UpdateContractSchema,
  ContractFilterSchema,
  UserRole,
} from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@ApiTags('contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Sözleşme oluştur' })
  create(
    @Body(new ZodValidationPipe(CreateContractSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.contractService.create(
      dto as Parameters<ContractService['create']>[0],
      ctx.tenantId!,
      ctx.userId,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Sözleşme listele' })
  findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = ContractFilterSchema.parse(query)
    return this.contractService.findAll(filter, ctx.tenantId!)
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Sözleşme detayı' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.contractService.findOne(id, ctx.tenantId!)
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Sözleşme güncelle' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateContractSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.contractService.update(
      id,
      dto as Parameters<ContractService['update']>[1],
      ctx.tenantId!,
    )
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Sözleşme sil' })
  delete(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.contractService.delete(id, ctx.tenantId!)
  }
}
