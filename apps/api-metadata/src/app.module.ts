import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { RolesGuard, TenantMiddleware } from '@sakin/api-core'
import { HealthController } from './health.controller'
import { PrismaModule } from './prisma/prisma.module'
import { SiteModule } from './modules/site/site.module'
import { UnitModule } from './modules/unit/unit.module'
import { ResidentModule } from './modules/resident/resident.module'
import { OccupancyModule } from './modules/occupancy/occupancy.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SiteModule,
    UnitModule,
    ResidentModule,
    OccupancyModule,
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
    consumer.apply(TenantMiddleware).exclude('health').forRoutes('*')
  }
}
