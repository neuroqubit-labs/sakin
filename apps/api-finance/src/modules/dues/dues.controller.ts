import { Controller, Get, Post, Patch, Param, Body, Query, UsePipes, ForbiddenException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { DuesService } from './dues.service'
import { Tenant, Roles } from '@sakin/api-core'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { TenantContext } from '@sakin/shared'
import {
  GenerateDuesSchema,
  DuesFilterSchema,
  UpdateDuesSchema,
  UserRole,
  WaiveDuesSchema,
} from '@sakin/shared'

@ApiTags('dues')
@ApiBearerAuth()
@Controller('dues')
export class DuesController {
  constructor(private readonly duesService: DuesService) {}

  private getTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Bu endpoint tenant kullanıcıları içindir')
    return ctx.tenantId
  }

  @Post('generate')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Siteye toplu aidat oluştur (TENANT_ADMIN)' })
  @UsePipes(new ZodValidationPipe(GenerateDuesSchema))
  async generate(@Body() dto: unknown, @Tenant() ctx: TenantContext) {
    return this.duesService.generate(
      dto as Parameters<DuesService['generate']>[0],
      this.getTenantId(ctx),
      ctx.userId,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Aidat listesi (TENANT_ADMIN, STAFF)' })
  async findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = DuesFilterSchema.parse(query)
    return this.duesService.findAll(filter, this.getTenantId(ctx))
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Aidat detayı (TENANT_ADMIN, STAFF)' })
  async findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.duesService.findOne(id, this.getTenantId(ctx))
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Aidat güncelle (TENANT_ADMIN)' })
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    const dto = UpdateDuesSchema.parse(body)
    return this.duesService.update(id, dto, this.getTenantId(ctx), ctx.userId)
  }

  @Post(':id/waive')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Aidat sil/affet (WAIVED)' })
  async waive(@Param('id') id: string, @Body() body: unknown, @Tenant() ctx: TenantContext) {
    const dto = WaiveDuesSchema.parse(body)
    return this.duesService.waive(id, dto, this.getTenantId(ctx), ctx.userId)
  }

  @Post('mark-overdue')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Vadesi geçmiş aidatları OVERDUE yap (TENANT_ADMIN)' })
  async markOverdue(@Tenant() ctx: TenantContext) {
    return this.duesService.markOverdue(this.getTenantId(ctx))
  }
}
