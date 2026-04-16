import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ExpenseService } from './expense.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { CreateExpenseSchema, UpdateExpenseSchema, ExpenseFilterSchema, DistributeExpenseSchema, UserRole } from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Gider kaydı oluştur (TENANT_ADMIN, STAFF)' })
  create(
    @Body(new ZodValidationPipe(CreateExpenseSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.expenseService.create(
      dto as Parameters<ExpenseService['create']>[0],
      ctx.tenantId!,
      ctx.userId,
    )
  }

  @Post('distribute')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Gider oluştur ve dairelere borç olarak dağıt (TENANT_ADMIN)' })
  distribute(
    @Body(new ZodValidationPipe(DistributeExpenseSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.expenseService.createWithDistribution(
      dto as Parameters<ExpenseService['createWithDistribution']>[0],
      ctx.tenantId!,
      ctx.userId,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Gider listesi (TENANT_ADMIN, STAFF)' })
  findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = ExpenseFilterSchema.parse(query)
    return this.expenseService.findAll(filter, ctx.tenantId!)
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Gider detayı (TENANT_ADMIN, STAFF)' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.expenseService.findOne(id, ctx.tenantId!)
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Gider güncelle (TENANT_ADMIN, STAFF)' })
  update(@Param('id') id: string, @Body() body: unknown, @Tenant() ctx: TenantContext) {
    const dto = UpdateExpenseSchema.parse(body)
    return this.expenseService.update(id, dto, ctx.tenantId!)
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Gider sil (TENANT_ADMIN)' })
  delete(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.expenseService.delete(id, ctx.tenantId!)
  }
}
