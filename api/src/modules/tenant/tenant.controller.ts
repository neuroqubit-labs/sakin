import { Controller, Get, Patch, Put, Body, ForbiddenException, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { TenantService } from './tenant.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { UpdateTenantSchema, UpsertTenantGatewayConfigSchema } from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'
import { UserRole } from '@sakin/shared'

@ApiTags('tenant')
@ApiBearerAuth()
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('users')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Tenant kullanıcılarını listele (TENANT_ADMIN, STAFF)' })
  listUsers(@Tenant() ctx: TenantContext) {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    return this.tenantService.listUsers(ctx.tenantId)
  }

  @Get('me')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: "Kendi tenant bilgilerini getir" })
  findMe(@Tenant() ctx: TenantContext) {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    return this.tenantService.findMe(ctx.tenantId)
  }

  @Get('work-summary')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Çalışan action center özeti (site filtreli)' })
  getWorkSummary(
    @Tenant() ctx: TenantContext,
    @Query('siteId') siteId?: string,
  ) {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    return this.tenantService.getWorkSummary(ctx.tenantId, siteId)
  }

  @Get('work-portfolio')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Çalışan portföy özeti' })
  getWorkPortfolio(@Tenant() ctx: TenantContext) {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    return this.tenantService.getWorkPortfolio(ctx.tenantId)
  }

  @Patch('me')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: "Kendi tenant iletişim bilgisini güncelle" })
  updateMe(@Tenant() ctx: TenantContext, @Body() body: unknown) {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    const dto = UpdateTenantSchema.parse(body)
    return this.tenantService.updateMe(ctx.tenantId, dto)
  }

  @Get('payment-gateway')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Ödeme gateway konfigürasyonunu getir' })
  getPaymentGateway(@Tenant() ctx: TenantContext) {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    return this.tenantService.getPaymentGatewayConfig(ctx.tenantId)
  }

  @Put('payment-gateway')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Ödeme gateway konfigürasyonunu kaydet' })
  upsertPaymentGateway(@Tenant() ctx: TenantContext, @Body() body: unknown) {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    const dto = UpsertTenantGatewayConfigSchema.parse(body)
    return this.tenantService.upsertPaymentGatewayConfig(ctx.tenantId, dto)
  }
}
