import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'

export type PushDriverName = 'mock' | 'fcm'

export interface PushMessageInput {
  tokens: string[]
  title: string
  body?: string
  data?: Record<string, string>
}

export interface PushSendResult {
  driver: PushDriverName
  attempted: number
  succeeded: number
  failed: number
  invalidTokens: string[]
}

export interface PushDriver {
  readonly name: PushDriverName
  send(input: PushMessageInput): Promise<PushSendResult>
}

/**
 * Mock sürücüsü: hiçbir yere push göndermez, logla bitirir.
 * Dev ortamında ve FCM credential'ları eklenene kadar staging'de kullanılır.
 */
class MockPushDriver implements PushDriver {
  readonly name: PushDriverName = 'mock'
  private readonly logger = new Logger('MockPushDriver')

  async send(input: PushMessageInput): Promise<PushSendResult> {
    this.logger.log(
      `[MOCK PUSH] tokens=${input.tokens.length} title="${input.title}" body="${(input.body ?? '').slice(0, 80)}"`,
    )
    return {
      driver: this.name,
      attempted: input.tokens.length,
      succeeded: input.tokens.length,
      failed: 0,
      invalidTokens: [],
    }
  }
}

/**
 * Firebase Cloud Messaging sürücüsü stub'ı. Bağlantı şu anda yapılmıyor.
 * Bağlarken:
 *   - `firebase-admin` paketi eklenecek
 *   - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env'leri (service account)
 *   - `admin.messaging().sendEachForMulticast({ tokens, notification: { title, body }, data })`
 *   - Yanıt içindeki `responses[i].error.code === 'messaging/registration-token-not-registered'`
 *     olanlar invalidTokens'e eklenip DeviceToken kaydından silinecek
 */
class FcmPushDriver implements PushDriver {
  readonly name: PushDriverName = 'fcm'

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async send(_input: PushMessageInput): Promise<PushSendResult> {
    throw new InternalServerErrorException(
      'FCM sürücüsü henüz bağlanmadı. PUSH_DRIVER=mock ile çalışın ya da Firebase entegrasyonunu etkinleştirin.',
    )
  }
}

@Injectable()
export class PushService {
  private readonly driver: PushDriver
  private readonly logger = new Logger(PushService.name)

  constructor() {
    const driverName = (process.env['PUSH_DRIVER'] ?? 'mock').toLowerCase() as PushDriverName
    if (driverName === 'fcm') this.driver = new FcmPushDriver()
    else this.driver = new MockPushDriver()
  }

  get driverName(): PushDriverName {
    return this.driver.name
  }

  /**
   * Push göndermek için driver'a delege eder. Boş token listesi no-op.
   * Caller sorumluluğu: invalidTokens dönerse DeviceToken tablosundan temizlemek.
   */
  async send(input: PushMessageInput): Promise<PushSendResult> {
    if (input.tokens.length === 0) {
      return { driver: this.driver.name, attempted: 0, succeeded: 0, failed: 0, invalidTokens: [] }
    }
    const result = await this.driver.send(input)
    this.logger.debug(
      `Push dispatched via ${result.driver}: ok=${result.succeeded}/${result.attempted} invalid=${result.invalidTokens.length}`,
    )
    return result
  }
}
