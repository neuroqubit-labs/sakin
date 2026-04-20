import { Injectable } from '@nestjs/common'
import type { Prisma } from '@sakin/database'
import type { PlatformSettingsDto } from '@sakin/shared'
import { PrismaService } from '../../prisma/prisma.service'

const DEFAULTS: PlatformSettingsDto = {
  systemName: 'Sakin',
  logoUrl: null,
  supportEmail: 'destek@sakin.com.tr',
  supportPhone: '+905000000000',
  defaultLanguage: 'tr',
  defaultTimezone: 'Europe/Istanbul',
  smsProvider: 'MOCK',
  smsSenderName: 'SAKIN',
  defaultPlan: 'TRIAL',
  defaultTrialDays: 30,
  maintenanceMode: false,
  maintenanceMessage: '',
}

@Injectable()
export class PlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<PlatformSettingsDto> {
    const rows = await this.prisma.platformSetting.findMany()
    const merged: Record<string, unknown> = { ...DEFAULTS }
    for (const row of rows) {
      merged[row.key] = row.value as unknown
    }
    return merged as PlatformSettingsDto
  }

  async update(dto: PlatformSettingsDto, actorUserId: string): Promise<PlatformSettingsDto> {
    const entries = Object.entries(dto).filter(([, v]) => v !== undefined)

    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.platformSetting.upsert({
          where: { key },
          create: {
            key,
            value: value as Prisma.InputJsonValue,
            updatedBy: actorUserId,
          },
          update: {
            value: value as Prisma.InputJsonValue,
            updatedBy: actorUserId,
          },
        }),
      ),
    )

    return this.getAll()
  }
}
