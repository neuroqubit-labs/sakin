import { Injectable, Logger } from '@nestjs/common'
import {
  PaymentConfirmedNotificationRequest,
  PaymentConfirmedNotificationResponse,
} from '../../../common/contracts/payment-confirmed-notification.contract'

@Injectable()
export class SupportNotificationClient {
  private readonly logger = new Logger(SupportNotificationClient.name)

  private resolveBaseUrl() {
    const explicit =
      process.env['INTERNAL_SUPPORT_BASE_URL'] ??
      process.env['SUPPORT_INTERNAL_BASE_URL']
    if (explicit) {
      return explicit.replace(/\/$/, '')
    }

    const apiPort = process.env['PORT'] ?? '3001'
    return `http://127.0.0.1:${apiPort}/api/v1`
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  async dispatchPaymentConfirmed(
    payload: PaymentConfirmedNotificationRequest,
  ): Promise<PaymentConfirmedNotificationResponse> {
    const baseUrl = this.resolveBaseUrl()
    const url = `${baseUrl}/internal/v1/notifications/payment-confirmed`
    const idempotencyKey = `payment-confirmed-${payload.paymentId}`
    const token = process.env['INTERNAL_SERVICE_TOKEN'] ?? 'dev-internal-token'
    const retryableCodes = new Set([429, 502, 503, 504])
    const backoff = [0, 200, 500]

    for (let attempt = 0; attempt < backoff.length; attempt += 1) {
      if (attempt > 0) {
        // jitter +/- 20%
        const baseDelay = backoff[attempt] ?? 0
        const jitter = Math.round(baseDelay * (Math.random() * 0.4 - 0.2))
        await this.sleep(baseDelay + jitter)
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 1500)

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service': 'api-finance',
            'X-Internal-Token': token,
            'X-Tenant-Id': payload.tenantId,
            'X-Idempotency-Key': idempotencyKey,
            'X-Request-Id': `${payload.paymentId}-${Date.now()}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (response.ok) {
          const json = (await response.json()) as {
            data?: PaymentConfirmedNotificationResponse
          }
          return (
            json.data ?? {
              accepted: true,
              notificationId: null,
              idempotentReplay: false,
            }
          )
        }

        if (!retryableCodes.has(response.status)) {
          this.logger.warn(
            `Support notification non-retryable status=${response.status} paymentId=${payload.paymentId}`,
          )
          return { accepted: false, notificationId: null, idempotentReplay: false }
        }
      } catch (error) {
        clearTimeout(timeout)
        if (attempt === backoff.length - 1) {
          this.logger.warn(
            `Support notification dispatch failed paymentId=${payload.paymentId} error=${String(error)}`,
          )
          return { accepted: false, notificationId: null, idempotentReplay: false }
        }
      }
    }

    return { accepted: false, notificationId: null, idempotentReplay: false }
  }
}
