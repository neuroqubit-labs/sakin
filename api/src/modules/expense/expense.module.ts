import { Module } from '@nestjs/common'
import { ExpenseController } from './expense.controller'
import { ExpenseService } from './expense.service'
import { LedgerModule } from '../ledger/ledger.module'
import { DuesModule } from '../dues/dues.module'

@Module({
  imports: [LedgerModule, DuesModule],
  controllers: [ExpenseController],
  providers: [ExpenseService],
})
export class ExpenseModule {}
