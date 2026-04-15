import { Controller, Post, Get, Body, UsePipes } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { TenantContext } from '@sakin/shared'
import { RegisterSchema } from '@sakin/shared'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Firebase token ile sisteme kayıt ol' })
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  async register(@Body() dto: unknown) {
    return this.authService.register(dto as Parameters<AuthService['register']>[0])
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Giriş yapmış kullanıcının profilini getir' })
  async getProfile(@Tenant() ctx: TenantContext) {
    return this.authService.getProfile(ctx.userId)
  }

  @Get('residencies')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kullanıcının aktif daireleri (RESIDENT)' })
  async getResidencies(@Tenant() ctx: TenantContext) {
    return this.authService.getResidencies(ctx.userId, ctx.tenantId)
  }

  @Get('dev-bootstrap')
  @ApiOperation({ summary: 'Dev hızlı giriş için tenant/bootstrap bilgisi (development only)' })
  async getDevBootstrap() {
    return this.authService.getDevBootstrap()
  }
}
