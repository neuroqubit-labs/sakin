import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { NotificationService } from './notification.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import type { TenantContext } from '@sakin/shared'
import { UserRole } from '@sakin/shared'

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
}
