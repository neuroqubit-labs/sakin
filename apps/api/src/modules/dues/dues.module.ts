import { Module } from '@nestjs/common'
import { DuesController } from './dues.controller'
import { DuesService } from './dues.service'
import { DuesScheduler } from './dues.scheduler'
import { LedgerModule } from '../ledger/ledger.module'

@Module({
  imports: [LedgerModule],
  controllers: [DuesController],
  providers: [DuesService, DuesScheduler],
  exports: [DuesService],
})
export class DuesModule {}
