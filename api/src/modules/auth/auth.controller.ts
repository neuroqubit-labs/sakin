import { Controller, Post, Get, Body, UsePipes, Req } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { TenantContext } from '@sakin/shared'
import {
  LoginSchema,
  OtpRequestSchema,
  OtpVerifySchema,
  RegisterSchema,
  RefreshTokenSchema,
} from '@sakin/shared'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Email + şifre ile giriş yap' })
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() dto: unknown, @Req() req: { ip?: string; headers?: Record<string, string | string[] | undefined> }) {
    const ua = req.headers?.['user-agent']
    return this.authService.login(dto as Parameters<AuthService['login']>[0], {
      ipAddress: req.ip ?? null,
      userAgent: typeof ua === 'string' ? ua : Array.isArray(ua) ? ua[0] ?? null : null,
    })
  }

  @Post('register')
  @ApiOperation({ summary: 'Email + şifre ile kayıt ol' })
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  async register(@Body() dto: unknown) {
    return this.authService.register(dto as Parameters<AuthService['register']>[0])
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh token ile yeni access token al' })
  @UsePipes(new ZodValidationPipe(RefreshTokenSchema))
  async refresh(@Body() dto: unknown) {
    return this.authService.refresh(dto as Parameters<AuthService['refresh']>[0])
  }

  @Post('otp/request')
  @ApiOperation({ summary: 'Sakin telefon numarasına OTP gönder (mobil login)' })
  @UsePipes(new ZodValidationPipe(OtpRequestSchema))
  async requestOtp(@Body() dto: unknown) {
    return this.authService.requestOtp(dto as Parameters<AuthService['requestOtp']>[0])
  }

  @Post('otp/verify')
  @ApiOperation({ summary: 'OTP kodunu doğrula ve JWT ver' })
  @UsePipes(new ZodValidationPipe(OtpVerifySchema))
  async verifyOtp(@Body() dto: unknown) {
    return this.authService.verifyOtp(dto as Parameters<AuthService['verifyOtp']>[0])
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
    return this.authService.getResidencies(ctx.userId, ctx.tenantId, ctx.residentId)
  }

  @Get('dev-bootstrap')
  @ApiOperation({ summary: 'Dev hızlı giriş için tenant/bootstrap bilgisi (development only)' })
  async getDevBootstrap() {
    return this.authService.getDevBootstrap()
  }
}
