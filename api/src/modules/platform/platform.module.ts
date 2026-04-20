import { Module } from '@nestjs/common'
import { PlatformController } from './platform.controller'
import { PlatformService } from './platform.service'
import { TenantManagementService } from './tenant-management.service'
import { PlatformAuditLogService } from './audit-log.service'
import { PlatformReportsService } from './reports.service'
import { PlatformSettingsService } from './platform-settings.service'

@Module({
  controllers: [PlatformController],
  providers: [
    PlatformService,
    TenantManagementService,
    PlatformAuditLogService,
    PlatformReportsService,
    PlatformSettingsService,
  ],
  exports: [PlatformAuditLogService],
})
export class PlatformModule {}
