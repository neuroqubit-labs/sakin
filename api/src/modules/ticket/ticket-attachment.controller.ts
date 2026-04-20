import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { TicketAttachmentService } from './ticket-attachment.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { UploadTicketAttachmentSchema, UserRole } from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@ApiTags('tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketAttachmentController {
  constructor(private readonly attachments: TicketAttachmentService) {}

  @Post(':id/attachments')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Talebe fotoğraf ekle (base64 gövde)' })
  upload(
    @Param('id') ticketId: string,
    @Body(new ZodValidationPipe(UploadTicketAttachmentSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.attachments.upload(
      ticketId,
      dto as Parameters<TicketAttachmentService['upload']>[1],
      ctx.tenantId!,
      { role: ctx.role, userId: ctx.userId },
    )
  }

  @Get(':id/attachments')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Talebe bağlı ekleri listele' })
  list(@Param('id') ticketId: string, @Tenant() ctx: TenantContext) {
    return this.attachments.list(ticketId, ctx.tenantId!, {
      role: ctx.role,
      userId: ctx.userId,
    })
  }

  // Ek dosyayı base64 olarak döner. Mobil `data:mime;base64,...` URI'sine sararak Image kaynağı yapar.
  // İndirme boyut sınırımız 5MB olduğu için JSON gövdesi yeterli. S3'e geçince bu endpoint
  // signed URL üretip redirect verecek şekilde güncellenecek.
  @Get('attachments/:attachmentId/download')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Eki base64 olarak indir' })
  async download(@Param('attachmentId') attachmentId: string, @Tenant() ctx: TenantContext) {
    const result = await this.attachments.download(attachmentId, ctx.tenantId!, {
      role: ctx.role,
      userId: ctx.userId,
    })
    return {
      mimeType: result.mimeType,
      filename: result.filename,
      data: result.buffer.toString('base64'),
    }
  }

  @Delete('attachments/:attachmentId')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Eki sil' })
  delete(@Param('attachmentId') attachmentId: string, @Tenant() ctx: TenantContext) {
    return this.attachments.delete(attachmentId, ctx.tenantId!, {
      role: ctx.role,
      userId: ctx.userId,
    })
  }
}
