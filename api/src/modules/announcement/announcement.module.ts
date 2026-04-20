import { Module } from '@nestjs/common'
import { AnnouncementController } from './announcement.controller'
import { AnnouncementService } from './announcement.service'
import { NotificationModule } from '../notification/notification.module'

@Module({
  imports: [NotificationModule],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
})
export class AnnouncementModule {}
