import { Module } from '@nestjs/common'
import { PlatformController } from './platform.controller'
import { PlatformService } from './platform.service'
import { TenantManagementService } from './tenant-management.service'

@Module({
  controllers: [PlatformController],
  providers: [PlatformService, TenantManagementService],
})
export class PlatformModule {}
