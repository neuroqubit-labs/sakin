import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { PaymentService } from './payment.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import {
  ConfirmManualBankTransferSchema,
  CreateCheckoutSessionSchema,
  CreateManualBankTransferIntentSchema,
  CreateManualCollectionSchema,
  PaymentExportFilterSchema,
  IyzicoWebhookSchema,
  PaymentFilterSchema,
  PaymentReconciliationFilterSchema,
  PaymentSuspiciousFilterSchema,
  UserRole,
  type TenantContext,
} from '@sakin/shared'

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('checkout')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Online kart ödeme oturumu oluştur' })
  createCheckout(
    @Body(new ZodValidationPipe(CreateCheckoutSessionSchema)) body: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.paymentService.createCheckoutSession(
      body as Parameters<PaymentService['createCheckoutSession']>[0],
      ctx.tenantId!,
      ctx.userId,
      ctx.role,
    )
  }

  @Post('manual-collection')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Nakit/POS manuel tahsilat' })
  createManualCollection(
    @Body(new ZodValidationPipe(CreateManualCollectionSchema)) body: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.paymentService.createManualCollection(
      body as Parameters<PaymentService['createManualCollection']>[0],
      ctx.tenantId!,
      ctx.userId,
    )
  }

  @Post('manual-bank-transfer')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Manuel banka transfer bildirimi (fallback)' })
  createManualBankTransfer(
    @Body(new ZodValidationPipe(CreateManualBankTransferIntentSchema)) body: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.paymentService.createManualBankTransferIntent(
      body as Parameters<PaymentService['createManualBankTransferIntent']>[0],
      ctx.tenantId!,
      ctx.userId,
      ctx.role,
    )
  }

  @Post('manual-bank-transfer/confirm')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Manuel banka transfer onay/red' })
  confirmManualBankTransfer(
    @Body(new ZodValidationPipe(ConfirmManualBankTransferSchema)) body: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.paymentService.confirmManualBankTransfer(
      body as Parameters<PaymentService['confirmManualBankTransfer']>[0],
      ctx.tenantId!,
      ctx.userId,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Ödeme listesi' })
  findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = PaymentFilterSchema.parse(query)
    return this.paymentService.findAll(filter, ctx.tenantId!)
  }

  @Get('my')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'Sakin kendi ödeme geçmişi (RESIDENT)' })
  findMine(
    @Tenant() ctx: TenantContext,
    @Query('limit') limitRaw?: string,
  ) {
    if (!ctx.unitId) {
      return { data: [] }
    }
    const limit = Math.min(parseInt(limitRaw ?? '30', 10) || 30, 100)
    return this.paymentService.findForResident(ctx.unitId, ctx.tenantId!, limit)
  }

  @Get('reconciliation-summary')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Ödeme mutabakat özeti (TENANT_ADMIN)' })
  reconciliationSummary(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = PaymentReconciliationFilterSchema.parse(query)
    return this.paymentService.reconciliationSummary(filter, ctx.tenantId!)
  }

  @Get('suspicious')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Şüpheli ödeme kuyruğu (TENANT_ADMIN)' })
  suspicious(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = PaymentSuspiciousFilterSchema.parse(query)
    return this.paymentService.suspiciousQueue(filter, ctx.tenantId!)
  }

  @Get('exports/receipt')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Receipt export (CSV)' })
  receiptExport(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = PaymentExportFilterSchema.parse(query)
    return this.paymentService.exportReceiptCsv(filter, ctx.tenantId!)
  }

  @Get('exports/audit')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Audit export (CSV)' })
  auditExport(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = PaymentExportFilterSchema.parse(query)
    return this.paymentService.exportAuditCsv(filter, ctx.tenantId!)
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Ödeme detayı' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.paymentService.findOne(id, ctx.tenantId!, {
      role: ctx.role,
      userId: ctx.userId,
      unitId: ctx.unitId,
    })
  }

  @Post(':id/refund')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Ödeme iadesi başlat' })
  refund(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.paymentService.startRefund(id, ctx.tenantId!, ctx.userId)
  }

  /**
   * iyzico webhook endpointi tenant middleware dışında kalır.
   */
  @Post('webhooks/iyzico')
  @ApiOperation({ summary: 'iyzico webhook endpointi' })
  handleIyzicoWebhook(
    @Body(new ZodValidationPipe(IyzicoWebhookSchema)) body: unknown,
    @Headers('x-iyz-signature') signature: string | undefined,
    @Headers('x-iyzi-signature') signatureV3: string | undefined,
    @Req() req: { rawBody?: Buffer | string; body?: unknown },
  ) {
    const payload = (req.body ?? body) as Record<string, unknown>
    const rawBody =
      typeof req.rawBody === 'string'
        ? req.rawBody
        : Buffer.isBuffer(req.rawBody)
          ? req.rawBody.toString('utf-8')
          : JSON.stringify(payload)

    return this.paymentService.handleIyzicoWebhook(payload, signatureV3 ?? signature, rawBody)
  }
}
