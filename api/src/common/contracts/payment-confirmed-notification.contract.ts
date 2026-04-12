export interface PaymentConfirmedNotificationRequest {
  tenantId: string
  paymentId: string
  unitId: string
  amount: number
  currency: string
  confirmedAt: string
  source: 'manual' | 'iyzico-webhook'
}

export interface PaymentConfirmedNotificationResponse {
  accepted: boolean
  notificationId: string | null
  idempotentReplay: boolean
}
