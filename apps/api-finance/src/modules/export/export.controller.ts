import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Roles, Tenant } from '@sakin/api-core'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import {
  CreateExportBatchSchema,
  ExportBatchFilterSchema,
  UserRole,
  type TenantContext,
} from '@sakin/shared'
import { ExportService } from './export.service'

@ApiTags('exports')
@ApiBearerAuth()
@Controller('exports')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('batches')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Yeni export batch oluştur' })
  createBatch(
    @Body(new ZodValidationPipe(CreateExportBatchSchema)) body: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.exportService.createBatch(
      body as Parameters<ExportService['createBatch']>[0],
      ctx.tenantId!,
      ctx.userId,
    )
  }

  @Get('batches')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Export batch listesi' })
  listBatches(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = ExportBatchFilterSchema.parse(query)
    return this.exportService.listBatches(filter, ctx.tenantId!)
  }

  @Get('batches/:id/download')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Export batch CSV çıktısı' })
  download(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.exportService.renderCsv(id, ctx.tenantId!)
  }
}
