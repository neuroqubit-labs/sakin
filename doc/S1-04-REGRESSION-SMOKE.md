# S1-04 Regression Smoke Report

Bu rapor, `S1-04 | Share tenant/guard/error/transform core across service apps` kapsamindaki temel dogrulamalari kaydeder.

## Scope

- Ortak cekirdek paket: `@sakin/api-core`
- Baglanan servis shell'leri:
  - `@sakin/api-auth`
  - `@sakin/api-finance`
  - `@sakin/api-metadata`
  - `@sakin/api-support`

## Shared Core Check

- Ortak middleware: `packages/api-core/src/middleware/tenant.middleware.ts`
- Ortak guard: `packages/api-core/src/guards/roles.guard.ts`
- Ortak exception filter: `packages/api-core/src/filters/http-exception.filter.ts`
- Ortak response interceptor: `packages/api-core/src/interceptors/transform.interceptor.ts`
- Ortak decoratorlar: `roles`, `tenant`

## Service Integration Check

Tum yeni servislerde:
- `app.module.ts` icinde `RolesGuard` + `TenantMiddleware` ortak paketten import edildi.
- `main.ts` icinde `AllExceptionsFilter` + `TransformInterceptor` ortak paketten import edildi.
- `health.controller.ts` lokal kaldirilmadi; servis bazli health response korunuyor.

## Command Smoke

Calistirilan komutlar:

```bash
npm --prefix apps/api-auth run build
npm --prefix apps/api-finance run dev
npm --prefix apps/api-metadata run typecheck
npm --prefix apps/api-support run build
```

Sonuc:
- Tum komutlar `exit code 0` ile tamamlandi.
- Bu ortamda toolchain eksikligi nedeniyle scriptler placeholder moda ayarli.
- Gercek `nest build/start` entegrasyonu S1-03/S1-04 CI adimlarinda tamamlanacak.

## Risk / Follow-up

- `TenantMiddleware` su an ortak pakette shell uyumlu minimal versiyonla calisiyor.
- `api-auth` strateji karari (S1-11) sonrasinda middleware davranisi kesinlestirilecek.
