import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'

export type SmsDriverName = 'mock' | 'netgsm' | 'iletimerkezi'

export interface SendSmsInput {
  to: string
  message: string
  // OTP mesajları için header/originator override'ı gerekebilir; Netgsm "başlık" alanını kullanır.
  from?: string
}

export interface SendSmsResult {
  driver: SmsDriverName
  providerMessageId: string | null
  acceptedAt: Date
}

export interface SmsDriver {
  readonly name: SmsDriverName
  send(input: SendSmsInput): Promise<SendSmsResult>
}

/**
 * Mock sürücüsü: hiçbir yere SMS göndermez, logla bitirir.
 * Dev ortamında ve entegrasyonlar bağlanana kadar prod-like staging'de kullanılır.
 */
class MockDriver implements SmsDriver {
  readonly name: SmsDriverName = 'mock'
  private readonly logger = new Logger('MockSmsDriver')

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    this.logger.log(`[MOCK SMS] to=${input.to} body="${input.message.slice(0, 80)}"`)
    return { driver: this.name, providerMessageId: null, acceptedAt: new Date() }
  }
}

/**
 * Netgsm sürücüsü stub'ı. Gerçek entegrasyon eklenene kadar çağrıldığında hata fırlatır.
 * Bağlarken:
 *   - NETGSM_USERCODE, NETGSM_PASSWORD, NETGSM_HEADER env'leri eklenecek
 *   - `@netgsm/sms` SDK'sı ya da REST API (POST https://api.netgsm.com.tr/sms/send/xml) çağrısı
 *   - Başarı: XML body içinde `00 <messageId>` → providerMessageId döner
 *   - Hata: `20`, `30`, `40` gibi kodlar → InternalServerErrorException olarak yüzeye çıkar
 */
class NetgsmDriver implements SmsDriver {
  readonly name: SmsDriverName = 'netgsm'

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async send(_input: SendSmsInput): Promise<SendSmsResult> {
    throw new InternalServerErrorException(
      'Netgsm sürücüsü henüz bağlanmadı. SMS_DRIVER=mock ile çalışın ya da Netgsm entegrasyonunu etkinleştirin.',
    )
  }
}

/**
 * İletimerkezi sürücüsü stub'ı. Gerçek entegrasyon eklenene kadar çağrıldığında hata fırlatır.
 * Bağlarken:
 *   - ILETIMERKEZI_USERNAME, ILETIMERKEZI_PASSWORD, ILETIMERKEZI_SENDER env'leri eklenecek
 *   - REST API: POST https://api.iletimerkezi.com/v1/send-sms/json
 *   - Başarı: `{"status":{"code":200}, "order":{"id":...}}` → providerMessageId olarak order.id
 */
class IletimerkeziDriver implements SmsDriver {
  readonly name: SmsDriverName = 'iletimerkezi'

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async send(_input: SendSmsInput): Promise<SendSmsResult> {
    throw new InternalServerErrorException(
      'İletimerkezi sürücüsü henüz bağlanmadı. SMS_DRIVER=mock ile çalışın ya da entegrasyonu etkinleştirin.',
    )
  }
}

@Injectable()
export class SmsService {
  private readonly driver: SmsDriver
  private readonly logger = new Logger(SmsService.name)

  constructor() {
    const driverName = (process.env['SMS_DRIVER'] ?? 'mock').toLowerCase() as SmsDriverName
    if (driverName === 'netgsm') this.driver = new NetgsmDriver()
    else if (driverName === 'iletimerkezi') this.driver = new IletimerkeziDriver()
    else this.driver = new MockDriver()
  }

  get driverName(): SmsDriverName {
    return this.driver.name
  }

  /**
   * OTP kodunu gönderir. Sürücüler şu an stub; Netgsm/İletimerkezi bağlanınca gerçek API çağrısı yapılır.
   * Caller'ın kendi hata işleme yükü: mock'ta başarısız olmaz, bağlı sürücüde InternalServerError atabilir.
   */
  async sendOtp(phoneNumber: string, code: string): Promise<SendSmsResult> {
    const message = `Sakin doğrulama kodunuz: ${code}. Kod 5 dakika geçerlidir.`
    const result = await this.driver.send({ to: phoneNumber, message })
    this.logger.debug(`SMS dispatched via ${result.driver} (messageId=${result.providerMessageId ?? 'n/a'})`)
    return result
  }

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    return this.driver.send(input)
  }
}
