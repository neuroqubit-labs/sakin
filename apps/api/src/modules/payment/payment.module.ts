import { Module } from '@nestjs/common'
import { PaymentController } from './payment.controller'
import { PaymentService } from './payment.service'
import { IyzicoService } from './iyzico.service'
import { LedgerModule } from '../ledger/ledger.module'
import { NotificationModule } from '../notification/notification.module'

@Module({
  imports: [LedgerModule, NotificationModule],
  controllers: [PaymentController],
  providers: [PaymentService, IyzicoService],
  exports: [PaymentService],
})
export class PaymentModule {}
