import { Injectable, Logger } from '@nestjs/common'
import { PushService } from '../../common/push/push.service'
import { DeviceTokenService } from './device-token.service'

export interface DispatchInput {
  userIds: string[]
  title: string
  body?: string
  data?: Record<string, string>
}

/**
 * In-app notification kaydı zaten NotificationService tarafından atılıyor.
 * Bu dispatcher üstüne push fan-out ekler: ilgili userId'lerin DeviceToken'larını
 * toplar, PushService'e yollar, invalid token'ları temizler.
 *
 * Push sürücüsü `mock` iken sadece loglar — provider bağlanınca aynı akış gerçek
 * bildirimi tetikler. Bu yüzden caller'a asla istisna sızdırmaz: push best-effort.
 */
@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name)

  constructor(
    private readonly push: PushService,
    private readonly deviceTokens: DeviceTokenService,
  ) {}

  async dispatch(input: DispatchInput): Promise<void> {
    if (input.userIds.length === 0) return
    try {
      const tokens = await this.deviceTokens.getActiveTokensForUsers(input.userIds)
      if (tokens.length === 0) return
      const result = await this.push.send({
        tokens,
        title: input.title,
        body: input.body,
        data: input.data,
      })
      if (result.invalidTokens.length > 0) {
        await this.deviceTokens.removeInvalidTokens(result.invalidTokens)
      }
    } catch (error) {
      this.logger.warn(
        `Push dispatch basarisiz (userIds=${input.userIds.length}): ${(error as Error).message}`,
      )
    }
  }
}
