import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { CashAccountService } from './cash-account.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import {
  CreateCashAccountSchema,
  UpdateCashAccountSchema,
  CashAccountFilterSchema,
  CreateCashTransactionSchema,
  CashTransactionFilterSchema,
  UserRole,
} from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@ApiTags('cash-accounts')
@ApiBearerAuth()
@Controller('cash-accounts')
export class CashAccountController {
  constructor(private readonly cashAccountService: CashAccountService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Kasa/banka hesabı oluştur (TENANT_ADMIN)' })
  create(
    @Body(new ZodValidationPipe(CreateCashAccountSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.cashAccountService.create(
      dto as Parameters<CashAccountService['create']>[0],
      ctx.tenantId!,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Kasa/banka hesapları listele' })
  findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = CashAccountFilterSchema.parse(query)
    return this.cashAccountService.findAll(filter, ctx.tenantId!)
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Kasa/banka hesap detayı' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.cashAccountService.findOne(id, ctx.tenantId!)
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Kasa/banka hesabı güncelle (TENANT_ADMIN)' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCashAccountSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.cashAccountService.update(
      id,
      dto as Parameters<CashAccountService['update']>[1],
      ctx.tenantId!,
    )
  }

  @Post(':id/transactions')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Kasa/banka hesabına işlem ekle' })
  createTransaction(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateCashTransactionSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.cashAccountService.createTransaction(
      id,
      dto as Parameters<CashAccountService['createTransaction']>[1],
      ctx.tenantId!,
      ctx.userId,
    )
  }

  @Get(':id/transactions')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Kasa/banka hesap işlemleri listele' })
  findTransactions(
    @Param('id') id: string,
    @Query() query: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    const filter = CashTransactionFilterSchema.parse(query)
    return this.cashAccountService.findTransactions(id, filter, ctx.tenantId!)
  }
}
