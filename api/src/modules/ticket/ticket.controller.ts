import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { TicketService } from './ticket.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import {
  CreateTicketSchema,
  UpdateTicketSchema,
  TicketFilterSchema,
  CreateTicketCommentSchema,
  UserRole,
} from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@ApiTags('tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Talep/arıza bildir' })
  create(
    @Body(new ZodValidationPipe(CreateTicketSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.ticketService.create(
      dto as Parameters<TicketService['create']>[0],
      ctx.tenantId!,
      ctx.userId,
      { role: ctx.role, userId: ctx.userId, unitId: ctx.unitId },
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Talep listele' })
  findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = TicketFilterSchema.parse(query)
    return this.ticketService.findAll(filter, ctx.tenantId!)
  }

  @Get('my')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'Kendi açtığım talepler' })
  findMy(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = TicketFilterSchema.parse(query)
    return this.ticketService.findMyTickets(ctx.tenantId!, ctx.userId!, filter)
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Talep detayı' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.ticketService.findOne(id, ctx.tenantId!, {
      role: ctx.role as UserRole,
      userId: ctx.userId,
    })
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Talep güncelle' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTicketSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.ticketService.update(
      id,
      dto as Parameters<TicketService['update']>[1],
      ctx.tenantId!,
    )
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Talep sil' })
  delete(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.ticketService.delete(id, ctx.tenantId!)
  }

  @Post(':id/comments')
  @Roles(UserRole.TENANT_ADMIN, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Yorum ekle' })
  addComment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateTicketCommentSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.ticketService.addComment(
      id,
      dto as Parameters<TicketService['addComment']>[1],
      ctx.tenantId!,
      ctx.userId!,
      { role: ctx.role, userId: ctx.userId },
    )
  }
}
