import { Module } from '@nestjs/common'
import { TicketController } from './ticket.controller'
import { TicketService } from './ticket.service'
import { TicketAttachmentController } from './ticket-attachment.controller'
import { TicketAttachmentService } from './ticket-attachment.service'
import { NotificationModule } from '../notification/notification.module'

@Module({
  imports: [NotificationModule],
  controllers: [TicketController, TicketAttachmentController],
  providers: [TicketService, TicketAttachmentService],
})
export class TicketModule {}
