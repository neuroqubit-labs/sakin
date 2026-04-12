import { Module } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { NotificationController } from './notification.controller'
import { PrismaModule } from '../../prisma/prisma.module'
import { InternalNotificationController } from './internal-notification.controller'

@Module({
  imports: [PrismaModule],
  controllers: [NotificationController, InternalNotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
