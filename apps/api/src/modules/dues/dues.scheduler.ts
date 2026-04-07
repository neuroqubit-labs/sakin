import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { DuesService } from './dues.service'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class DuesScheduler {
  private readonly logger = new Logger(DuesScheduler.name)

  constructor(
    private readonly duesService: DuesService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Her gün 08:00 Türkiye saatinde (05:00 UTC) tüm aktif tenant'lar için
   * vadesi geçmiş aidatları OVERDUE olarak işaretle.
   */
  @Cron('0 5 * * *', { timeZone: 'Europe/Istanbul' })
  async markAllTenantsOverdue() {
    this.logger.log('Vadesi geçmiş aidat taraması başlıyor...')

    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    })

    let totalUpdated = 0
    for (const tenant of tenants) {
      try {
        const result = await this.duesService.markOverdue(tenant.id)
        if (result.updated > 0) {
          this.logger.log(`${tenant.name}: ${result.updated} aidat OVERDUE yapıldı`)
          totalUpdated += result.updated
        }
      } catch (error) {
        this.logger.error(`${tenant.name} için overdue işlemi başarısız:`, error)
      }
    }

    this.logger.log(`Tarama tamamlandı. Toplam: ${totalUpdated} aidat güncellendi.`)
  }
}
