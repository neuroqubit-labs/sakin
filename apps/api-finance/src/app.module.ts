import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { RolesGuard, TenantMiddleware } from '@sakin/api-core'
import { HealthController } from './health.controller'
import { PrismaModule } from './prisma/prisma.module'
import { DuesModule } from './modules/dues/dues.module'
import { PaymentModule } from './modules/payment/payment.module'
import { LedgerModule } from './modules/ledger/ledger.module'
import { ExportModule } from './modules/export/export.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    DuesModule,
    PaymentModule,
    LedgerModule,
    ExportModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude('health', 'payments/webhooks/iyzico')
      .forRoutes('*')
  }
}
