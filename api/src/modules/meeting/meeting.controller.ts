import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { MeetingService } from './meeting.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import {
  CreateMeetingSchema,
  UpdateMeetingSchema,
  MeetingFilterSchema,
  CreateMeetingDecisionSchema,
  UserRole,
} from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@ApiTags('meetings')
@ApiBearerAuth()
@Controller('meetings')
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Toplantı oluştur' })
  create(
    @Body(new ZodValidationPipe(CreateMeetingSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.meetingService.create(
      dto as Parameters<MeetingService['create']>[0],
      ctx.tenantId!,
      ctx.userId,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Toplantı listele' })
  findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = MeetingFilterSchema.parse(query)
    return this.meetingService.findAll(filter, ctx.tenantId!)
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Toplantı detayı' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.meetingService.findOne(id, ctx.tenantId!)
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Toplantı güncelle' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateMeetingSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.meetingService.update(
      id,
      dto as Parameters<MeetingService['update']>[1],
      ctx.tenantId!,
    )
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Toplantı sil' })
  delete(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.meetingService.delete(id, ctx.tenantId!)
  }

  @Post(':id/decisions')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Karar ekle' })
  addDecision(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateMeetingDecisionSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.meetingService.addDecision(
      id,
      dto as Parameters<MeetingService['addDecision']>[1],
      ctx.tenantId!,
    )
  }

  @Delete(':id/decisions/:decisionId')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Karar sil' })
  deleteDecision(
    @Param('id') id: string,
    @Param('decisionId') decisionId: string,
    @Tenant() ctx: TenantContext,
  ) {
    return this.meetingService.deleteDecision(id, decisionId, ctx.tenantId!)
  }
}
