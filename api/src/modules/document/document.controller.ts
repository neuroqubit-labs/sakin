import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { DocumentService } from './document.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { CreateDocumentSchema, DocumentFilterSchema, UserRole } from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Belge kaydı oluştur' })
  create(
    @Body(new ZodValidationPipe(CreateDocumentSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.documentService.create(
      dto as Parameters<DocumentService['create']>[0],
      ctx.tenantId!,
      ctx.userId,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Belge listele' })
  findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = DocumentFilterSchema.parse(query)
    return this.documentService.findAll(filter, ctx.tenantId!)
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Belge detayı' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.documentService.findOne(id, ctx.tenantId!)
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Belge sil' })
  delete(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.documentService.delete(id, ctx.tenantId!)
  }
}
