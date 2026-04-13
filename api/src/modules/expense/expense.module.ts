import { Module } from '@nestjs/common'
import { ExpenseController } from './expense.controller'
import { ExpenseService } from './expense.service'
import { LedgerModule } from '../ledger/ledger.module'

@Module({
  imports: [LedgerModule],
  controllers: [ExpenseController],
  providers: [ExpenseService],
})
export class ExpenseModule {}
