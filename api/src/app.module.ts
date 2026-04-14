import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import configuration from './config/configuration'
import { PrismaModule } from './prisma/prisma.module'
import { TenantMiddleware } from './common/middleware/tenant.middleware'
import { AuthModule } from './modules/auth/auth.module'
import { SiteModule } from './modules/site/site.module'
import { DuesModule } from './modules/dues/dues.module'
import { TenantModule } from './modules/tenant/tenant.module'
import { PlatformModule } from './modules/platform/platform.module'
import { UnitModule } from './modules/unit/unit.module'
import { ResidentModule } from './modules/resident/resident.module'
import { PaymentModule } from './modules/payment/payment.module'
import { ExpenseModule } from './modules/expense/expense.module'
import { AnnouncementModule } from './modules/announcement/announcement.module'
import { RolesGuard } from './common/guards/roles.guard'
import { LedgerModule } from './modules/ledger/ledger.module'
import { ExportModule } from './modules/export/export.module'
import { OccupancyModule } from './modules/occupancy/occupancy.module'
import { NotificationModule } from './modules/notification/notification.module'
import { CashAccountModule } from './modules/cash-account/cash-account.module'
import { SiteStaffModule } from './modules/site-staff/site-staff.module'
import { VendorModule } from './modules/vendor/vendor.module'
import { TicketModule } from './modules/ticket/ticket.module'
import { LegalCaseModule } from './modules/legal-case/legal-case.module'
import { DocumentModule } from './modules/document/document.module'
import { ContractModule } from './modules/contract/contract.module'
import { CommunicationModule } from './modules/communication/communication.module'
import { FacilityModule } from './modules/facility/facility.module'
import { MeetingModule } from './modules/meeting/meeting.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    TenantModule,
    PlatformModule,
    SiteModule,
    UnitModule,
    ResidentModule,
    DuesModule,
    PaymentModule,
    LedgerModule,
    ExportModule,
    OccupancyModule,
    ExpenseModule,
    AnnouncementModule,
    NotificationModule,
    CashAccountModule,
    SiteStaffModule,
    VendorModule,
    TicketModule,
    LegalCaseModule,
    DocumentModule,
    ContractModule,
    CommunicationModule,
    FacilityModule,
    MeetingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // iyzico callback ve auth/register hariç tüm route'lara tenant middleware uygula
    consumer
      .apply(TenantMiddleware)
      .exclude(
        'health',
        'auth/register',
        'auth/dev-bootstrap',
        'payments/webhooks/iyzico',
        'internal/v1/notifications/payment-confirmed',
      )
      .forRoutes('*')
  }
}
