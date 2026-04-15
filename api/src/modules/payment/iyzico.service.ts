import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { PrismaService } from '../../prisma/prisma.service'
import { PaymentProvider } from '@sakin/shared'

interface IyzicoConfig {
  apiKey: string
  secretKey: string
  baseUrl: string
}

interface CheckoutFormParams {
  tenantId: string
  conversationId: string
  duesId?: string
  amount: number
  callbackUrl: string
  buyer: {
    name: string
    surname: string
    phoneNumber: string
    email?: string
  }
}

interface CheckoutFormResult {
  status: 'success' | 'failure'
  token?: string
  checkoutFormContent?: string
  paymentId?: string
  errorMessage?: string
}

interface CallbackResult {
  status: 'success' | 'failure'
  paymentId?: string
  conversationId?: string
  paidPrice?: number
  currency?: string
  errorMessage?: string
}

@Injectable()
export class IyzicoService {
  private readonly logger = new Logger(IyzicoService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveConfig(tenantId: string): Promise<IyzicoConfig> {
    const gateway = await this.prisma.tenantPaymentGatewayConfig.findFirst({
      where: {
        tenantId,
        provider: PaymentProvider.IYZICO,
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    // dev note: Marketplace/sub-merchant dağıtımı ikinci faza bırakıldı | hedef: M2-marketplace-settlement | etki: Komisyon/settlement platform katmanında yönetilmiyor. backlog: SKN-330
    return {
      apiKey: gateway?.apiKey ?? this.configService.get<string>('iyzico.apiKey') ?? '',
      secretKey: gateway?.secretKey ?? this.configService.get<string>('iyzico.secretKey') ?? '',
      baseUrl: this.configService.get<string>('iyzico.baseUrl') ?? 'https://sandbox-api.iyzipay.com',
    }
  }

  private generateAuthHeader(config: IyzicoConfig, body: string): string {
    const randomString = Math.random().toString(36).slice(2)
    const hash = crypto
      .createHmac('sha256', config.secretKey)
      .update(`${config.apiKey}${randomString}${body}`)
      .digest('base64')
    return `apiKey:${config.apiKey}&randomKey:${randomString}&signature:${hash}`
  }

  async initiateCheckoutForm(params: CheckoutFormParams): Promise<CheckoutFormResult> {
    const config = await this.resolveConfig(params.tenantId)

    const requestBody = {
      locale: 'tr',
      conversationId: params.conversationId,
      price: params.amount.toFixed(2),
      paidPrice: params.amount.toFixed(2),
      currency: 'TRY',
      basketId: params.duesId ?? params.conversationId,
      paymentGroup: 'SUBSCRIPTION',
      callbackUrl: params.callbackUrl,
      enabledInstallments: [1, 2, 3, 6],
      buyer: {
        id: params.conversationId,
        name: params.buyer.name,
        surname: params.buyer.surname,
        gsmNumber: params.buyer.phoneNumber,
        email: params.buyer.email ?? `${params.conversationId}@sakin.app`,
        identityNumber: '11111111111',
        registrationAddress: 'Türkiye',
        city: 'İstanbul',
        country: 'Turkey',
      },
      shippingAddress: {
        contactName: `${params.buyer.name} ${params.buyer.surname}`,
        city: 'İstanbul',
        country: 'Turkey',
        address: 'Türkiye',
      },
      billingAddress: {
        contactName: `${params.buyer.name} ${params.buyer.surname}`,
        city: 'İstanbul',
        country: 'Turkey',
        address: 'Türkiye',
      },
      basketItems: [
        {
          id: params.duesId ?? params.conversationId,
          name: 'Aidat Ödemesi',
          category1: 'Aidat',
          itemType: 'VIRTUAL',
          price: params.amount.toFixed(2),
        },
      ],
    }

    const bodyStr = JSON.stringify(requestBody)

    try {
      const response = await fetch(
        `${config.baseUrl}/payment/iyzipos/checkoutform/initialize/auth/ecommerce`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.generateAuthHeader(config, bodyStr),
          },
          body: bodyStr,
        },
      )

      const data = (await response.json()) as {
        status: string
        token?: string
        checkoutFormContent?: string
        paymentId?: string
        errorMessage?: string
      }

      if (data.status === 'success' && data.token) {
        return {
          status: 'success',
          token: data.token,
          checkoutFormContent: data.checkoutFormContent,
          paymentId: data.paymentId,
        }
      }

      return {
        status: 'failure',
        errorMessage: data.errorMessage ?? 'iyzico hatası',
      }
    } catch (error) {
      this.logger.error('iyzico initiateCheckoutForm error', error)
      return { status: 'failure', errorMessage: 'iyzico servisine ulaşılamıyor' }
    }
  }

  async retrieveCheckoutResult(tenantId: string, token: string): Promise<CallbackResult> {
    const config = await this.resolveConfig(tenantId)
    const requestBody = { locale: 'tr', conversationId: token, token }
    const bodyStr = JSON.stringify(requestBody)

    try {
      const response = await fetch(
        `${config.baseUrl}/payment/iyzipos/checkoutform/auth/ecommerce/detail`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.generateAuthHeader(config, bodyStr),
          },
          body: bodyStr,
        },
      )

      const data = (await response.json()) as {
        status: string
        paymentId?: string
        conversationId?: string
        paidPrice?: number
        currency?: string
        errorMessage?: string
      }

      if (data.status === 'success') {
        return {
          status: 'success',
          paymentId: data.paymentId,
          conversationId: data.conversationId,
          paidPrice: data.paidPrice,
          currency: data.currency,
        }
      }

      return {
        status: 'failure',
        errorMessage: data.errorMessage ?? 'Ödeme doğrulanamadı',
      }
    } catch (error) {
      this.logger.error('iyzico retrieveCheckoutResult error', error)
      return { status: 'failure', errorMessage: 'iyzico servisine ulaşılamıyor' }
    }
  }

  async validateWebhookSignature(
    tenantId: string,
    payloadRaw: string,
    signatureHeader: string | undefined,
  ): Promise<boolean> {
    if (!signatureHeader) {
      // İmzasız webhook yalnızca development modunda VE ALLOW_WEBHOOK_DEV=true iken kabul edilir.
      // Staging/prod yanlış konumlandırıldığında spoofable olmasın diye çift kilit.
      const isDev = process.env['NODE_ENV'] === 'development'
      const allowDev = process.env['ALLOW_WEBHOOK_DEV'] === 'true'
      if (isDev && allowDev) {
        this.logger.warn('iyzico webhook imzasız kabul edildi (ALLOW_WEBHOOK_DEV aktif)')
        return true
      }
      return false
    }

    const config = await this.resolveConfig(tenantId)
    const digest = crypto
      .createHmac('sha256', config.secretKey)
      .update(payloadRaw)
      .digest('hex')

    return digest === signatureHeader
  }
}
