import { Module } from '@nestjs/common'
import { CashAccountController } from './cash-account.controller'
import { CashAccountService } from './cash-account.service'

@Module({
  controllers: [CashAccountController],
  providers: [CashAccountService],
  exports: [CashAccountService],
})
export class CashAccountModule {}
