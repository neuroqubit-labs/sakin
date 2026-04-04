import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import configuration from './config/configuration'
import { PrismaModule } from './prisma/prisma.module'
import { TenantMiddleware } from './common/middleware/tenant.middleware'
import { AuthModule } from './modules/auth/auth.module'
import { SiteModule } from './modules/site/site.module'
import { DuesModule } from './modules/dues/dues.module'
import { TenantModule } from './modules/tenant/tenant.module'
import { UnitModule } from './modules/unit/unit.module'
import { ResidentModule } from './modules/resident/resident.module'
import { PaymentModule } from './modules/payment/payment.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuthModule,
    TenantModule,
    SiteModule,
    UnitModule,
    ResidentModule,
    DuesModule,
    PaymentModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // /auth/register hariç tüm route'lara tenant middleware uygula
    consumer
      .apply(TenantMiddleware)
      .exclude('health', 'auth/register')
      .forRoutes('*')
  }
}
