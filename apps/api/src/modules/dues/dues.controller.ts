import { Controller, Get, Post, Patch, Param, Body, Query, UsePipes } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { DuesService } from './dues.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { TenantContext } from '@sakin/shared'
import { GenerateDuesSchema, DuesFilterSchema, UpdateDuesSchema } from '@sakin/shared'

@ApiTags('dues')
@ApiBearerAuth()
@Controller('dues')
export class DuesController {
  constructor(private readonly duesService: DuesService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Siteye toplu aidat oluştur' })
  @UsePipes(new ZodValidationPipe(GenerateDuesSchema))
  async generate(@Body() dto: unknown, @Tenant() ctx: TenantContext) {
    return this.duesService.generate(
      dto as Parameters<DuesService['generate']>[0],
      ctx.tenantId,
    )
  }

  @Get()
  @ApiOperation({ summary: 'Aidat listesi (filtreli, sayfalı)' })
  async findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = DuesFilterSchema.parse(query)
    return this.duesService.findAll(filter, ctx.tenantId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Aidat detayı' })
  async findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.duesService.findOne(id, ctx.tenantId)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Aidat güncelle (admin düzeltmesi)' })
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    const dto = UpdateDuesSchema.parse(body)
    return this.duesService.update(id, dto, ctx.tenantId)
  }

  @Post('mark-overdue')
  @ApiOperation({ summary: 'Vadesi geçmiş aidatları OVERDUE yap' })
  async markOverdue(@Tenant() ctx: TenantContext) {
    return this.duesService.markOverdue(ctx.tenantId)
  }
}
