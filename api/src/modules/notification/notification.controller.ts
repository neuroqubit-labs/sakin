import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { NotificationService } from './notification.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import type { TenantContext } from '@sakin/shared'
import {
  CreateNotificationBroadcastSchema,
  NotificationHistoryFilterSchema,
  UserRole,
} from '@sakin/shared'

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Kullanıcının bildirimlerini listele' })
  list(
    @Tenant() ctx: TenantContext,
    @Query('limit') limitRaw?: string,
  ) {
    const limit = Math.min(parseInt(limitRaw ?? '20', 10) || 20, 100)
    return this.notificationService.listForUser(ctx.userId, ctx.tenantId!, limit)
  }

  @Get('unread-count')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Okunmamış bildirim sayısı' })
  async unreadCount(@Tenant() ctx: TenantContext) {
    const count = await this.notificationService.countUnread(ctx.userId, ctx.tenantId!)
    return { count }
  }

  @Post(':id/read')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Bildirimi okundu işaretle' })
  markRead(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.notificationService.markAsRead(id, ctx.userId, ctx.tenantId!)
  }

  @Post('read-all')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Tüm bildirimleri okundu işaretle' })
  markAllRead(@Tenant() ctx: TenantContext) {
    return this.notificationService.markAllAsRead(ctx.userId, ctx.tenantId!)
  }

  @Post('broadcast')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Hedefli iletisim bildirimi olustur' })
  broadcast(@Tenant() ctx: TenantContext, @Body() body: unknown) {
    const dto = CreateNotificationBroadcastSchema.parse(body)
    return this.notificationService.createBroadcast(dto, ctx.tenantId!, ctx.userId)
  }

  @Get('history')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Iletisim gonderim gecmisi' })
  history(@Tenant() ctx: TenantContext, @Query() query: unknown) {
    const filter = NotificationHistoryFilterSchema.parse(query)
    return this.notificationService.listHistory(filter, ctx.tenantId!)
  }
}
