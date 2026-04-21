import { Module } from '@nestjs/common'
import { PaymentController } from './payment.controller'
import { PaymentService } from './payment.service'
import { IyzicoService } from './iyzico.service'
import { LedgerModule } from '../ledger/ledger.module'
import { CashAccountModule } from '../cash-account/cash-account.module'
import { SupportNotificationClient } from './internal/support-notification.client'

@Module({
  imports: [LedgerModule, CashAccountModule],
  controllers: [PaymentController],
  providers: [PaymentService, IyzicoService, SupportNotificationClient],
  exports: [PaymentService],
})
export class PaymentModule {}
