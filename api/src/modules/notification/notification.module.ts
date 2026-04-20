import { Module } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { NotificationController } from './notification.controller'
import { PrismaModule } from '../../prisma/prisma.module'
import { InternalNotificationController } from './internal-notification.controller'
import { DeviceTokenService } from './device-token.service'
import { NotificationDispatcher } from './notification.dispatcher'

@Module({
  imports: [PrismaModule],
  controllers: [NotificationController, InternalNotificationController],
  providers: [NotificationService, DeviceTokenService, NotificationDispatcher],
  exports: [NotificationService, DeviceTokenService, NotificationDispatcher],
})
export class NotificationModule {}
