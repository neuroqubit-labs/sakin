# S1-07b Finance-Support Contract + Adapter Smoke

Bu rapor, `S1-07b | Implement finance-support sync contract + adapter for payment notifications` kapsamindaki implementasyon ve dogrulama kaydidir.

## Uygulanan Degisiklikler

- Payment tarafinda dogrudan `NotificationService` bagimliligi kaldirildi.
- Yeni adapter eklendi:
  - `apps/api/src/modules/payment/internal/support-notification.client.ts`
- Internal contract endpoint eklendi:
  - `POST /api/v1/internal/v1/notifications/payment-confirmed`
  - `apps/api/src/modules/notification/internal-notification.controller.ts`
- Contract tipi ortak alana tasindi:
  - `apps/api/src/common/contracts/payment-confirmed-notification.contract.ts`
- Tenant middleware exclusion eklendi:
  - `internal/v1/notifications/payment-confirmed`

## Dogrulanan Noktalar

- `payment.module.ts` artik `NotificationModule` import etmiyor.
- `payment.service.ts` artik `NotificationService` import etmiyor.
- Payment onayi sonrasi side-effect:
  - manual collection akisinda adapter dispatch var
  - iyzico webhook confirm akisinda adapter dispatch var
- Support endpoint idempotent replay cevabi donebiliyor.

## Timeout / Retry / Fallback

- Adapter timeout: 1500ms
- Retry: 2 (200ms, 500ms backoff + jitter)
- Retryable status: 429, 502, 503, 504
- Basarisiz dispatch'te payment rollback edilmez, `AuditLog` icine `NOTIFICATION_DISPATCH_FAILED` yazilir.
