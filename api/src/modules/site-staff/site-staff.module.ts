import { Module } from '@nestjs/common'
import { SiteStaffController } from './site-staff.controller'
import { SiteStaffService } from './site-staff.service'

@Module({
  controllers: [SiteStaffController],
  providers: [SiteStaffService],
})
export class SiteStaffModule {}
