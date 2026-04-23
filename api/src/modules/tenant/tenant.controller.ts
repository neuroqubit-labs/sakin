import { Controller, Get, Patch, Put, Post, Delete, Body, Param, ForbiddenException, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { TenantService } from './tenant.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { InviteUserSchema, UpdateTenantSchema, UpdateTenantUserSchema, UpsertTenantGatewayConfigSchema } from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'
import { UserRole } from '@sakin/shared'

@ApiTags('tenant')
@ApiBearerAuth()
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('users')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Tenant kullanıcılarını listele (TENANT_ADMIN)' })
  listUsers(@Tenant() ctx: TenantContext) {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    return this.tenantService.listUsers(ctx.tenantId)
  }

  @Get('me')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: "Kendi tenant bilgilerini getir (TENANT_ADMIN)" })
  findMe(@Tenant() ctx: TenantContext) {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    return this.tenantService.findMe(ctx.tenantId)
  }

  @Get('work-summary')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Yönetim action center özeti (TENANT_ADMIN)' })
  getWorkSummary(
    @Tenant() ctx: TenantContext,
    @Query('siteId') siteId?: string,
  ) {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    return this.tenantService.getWorkSummary(ctx.tenantId, siteId)
  }

  @Get('work-portfolio')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Yönetim portföy özeti (TENANT_ADMIN)' })
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

  @Post('users')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Yeni personel / yönetici davet et (TENANT_ADMIN)' })
  inviteUser(@Tenant() ctx: TenantContext, @Body() body: unknown) {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    const dto = InviteUserSchema.parse(body)
    return this.tenantService.inviteUser(ctx.tenantId, dto)
  }

  @Patch('users/:userId')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Kullanıcı rolü veya durumunu güncelle (TENANT_ADMIN)' })
  updateUser(
    @Tenant() ctx: TenantContext,
    @Param('userId') userId: string,
    @Body() body: unknown,
  ) {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    const dto = UpdateTenantUserSchema.parse(body)
    return this.tenantService.updateTenantUser(ctx.tenantId, userId, dto)
  }

  @Delete('users/:userId')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Kullanıcıyı pasifleştir (TENANT_ADMIN)' })
  deactivateUser(
    @Tenant() ctx: TenantContext,
    @Param('userId') userId: string,
  ) {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    return this.tenantService.deactivateTenantUser(ctx.tenantId, userId)
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
