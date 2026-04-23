import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { CommunicationService } from './communication.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { CreateCommunicationLogSchema, CommunicationLogFilterSchema, UserRole } from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@ApiTags('communications')
@ApiBearerAuth()
@Controller('communications')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'İletişim kaydı oluştur' })
  create(
    @Body(new ZodValidationPipe(CreateCommunicationLogSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.communicationService.create(
      dto as Parameters<CommunicationService['create']>[0],
      ctx.tenantId!,
      ctx.userId,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'İletişim kayıtları listele' })
  findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = CommunicationLogFilterSchema.parse(query)
    return this.communicationService.findAll(filter, ctx.tenantId!)
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'İletişim kaydı detayı' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.communicationService.findOne(id, ctx.tenantId!)
  }
}
