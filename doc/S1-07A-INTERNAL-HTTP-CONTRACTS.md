# S1-07a Internal HTTP Contracts (Sync v1)

Bu dokuman, Sprint 1 kapsamindaki minimum servisler arasi sync HTTP sozlesmesini dondurur.

- Issue: `S1-07a | Define minimum internal HTTP contracts (sync v1)`
- Durum: `Draft -> Frozen (S1 sonunda)`
- Hedef: `S1-07b` implementasyonuna teknik baz saglamak

## 1) Contract Scope (v1)

v1 kapsaminda zorunlu internal cagri:

- `api-finance -> api-support`: odeme onayi sonrasi notification side-effect

v1 kapsam disi:

- Event broker/outbox
- Async delivery garantisi
- Cross-service distributed transaction

## 2) Endpoint Listesi

## 2.1 Finance -> Support

- Method: `POST`
- Path: `/internal/v1/notifications/payment-confirmed`
- Caller: `api-finance`
- Owner: `api-support`
- Auth: `X-Internal-Service: api-finance` + `X-Internal-Token`
- Tenant Scope: `X-Tenant-Id` zorunlu
- Idempotency: `X-Idempotency-Key` zorunlu (`payment-confirmed-{paymentId}`)

Amaç:
- `payment.CONFIRMED` olan islem icin support tarafinda tek notification kaydi olusturmak.

## Request Body (JSON)

```json
{
  "tenantId": "uuid",
  "paymentId": "uuid",
  "unitId": "uuid",
  "amount": 1250.5,
  "currency": "TRY",
  "confirmedAt": "2026-04-09T10:15:30.000Z",
  "source": "manual|iyzico-webhook"
}
```

## Success Response

```json
{
  "data": {
    "accepted": true,
    "notificationId": "uuid",
    "idempotentReplay": false
  }
}
```

## Idempotent Replay Response

```json
{
  "data": {
    "accepted": true,
    "notificationId": "uuid",
    "idempotentReplay": true
  }
}
```

## Error Response (shared format)

```json
{
  "statusCode": 503,
  "message": "Service unavailable",
  "error": "SERVICE_UNAVAILABLE",
  "details": {
    "service": "api-support",
    "operation": "payment-confirmed-notification"
  }
}
```

## 3) Timeout / Retry / Error Standardi

- Client timeout:
  - Connect timeout: `300ms`
  - Total request timeout: `1500ms`
- Retry policy:
  - Maksimum `2` retry (toplam 3 deneme)
  - Backoff: `200ms`, `500ms` (jitter +/- 20%)
  - Sadece `429`, `502`, `503`, `504` icin retry
- Retry disi status:
  - `400/401/403/404/409`: retry yok, warning log
- Fallback:
  - Notification cagri basarisiz olsa da payment confirm rollback edilmez
  - Finance tarafi audit log'a `NOTIFICATION_DISPATCH_FAILED` yazar
  - S2/S3'te replay mekanizmasi icin kayit tutulur

## 4) Guvenlik ve Header Standardi

Zorunlu header'lar:

- `X-Internal-Service`: cagirici servis kimligi
- `X-Internal-Token`: servisler arasi paylasilan token/JWT
- `X-Tenant-Id`: tenant scope
- `X-Request-Id`: izleme korelasyonu
- `X-Idempotency-Key`: duplicate cagri engelleme

Kural:
- Internal endpointler public gateway'den acilmaz.
- Sadece service network icinden erisilir.

## 5) Versionlama ve Uyum

- Path versioning: `/internal/v1/*`
- Breaking degisiklikte `v2` path acilir, `v1` en az 1 sprint birlikte yasar.
- Non-breaking alanlar opsiyonel eklenebilir.

## 6) Acceptance Mapping (S1-07a)

- Internal endpoint listesi: bu dokumanin `Bolum 2`
- Request/response ornekleri: bu dokumanin `Bolum 2.1`
- Timeout/retry/error standardi: bu dokumanin `Bolum 3`
