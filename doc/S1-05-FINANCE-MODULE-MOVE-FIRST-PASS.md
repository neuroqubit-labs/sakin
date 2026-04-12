# S1-05 Finance Module Move (First Pass)

Bu not, `S1-05 | Move dues/payment/ledger/export into api-finance` kapsamindaki ilk tasima adiminin ozetidir.

## Tasinan Alanlar

- `dues` modulu
- `payment` modulu
- `ledger` modulu
- `export` modulu
- Gerekli ortak finance yardimcilari:
  - `common/finance/finance.utils.ts`
  - `common/audit/audit-actions.ts`
  - `common/pipes/zod-validation.pipe.ts`
  - `common/contracts/payment-confirmed-notification.contract.ts`
- Prisma katmani:
  - `prisma/prisma.module.ts`
  - `prisma/prisma.service.ts`

## AppModule Entegrasyonu

`apps/api-finance/src/app.module.ts` icine eklendi:
- `ScheduleModule`
- `PrismaModule`
- `DuesModule`
- `PaymentModule`
- `LedgerModule`
- `ExportModule`

## Controller/Guard Uyumlama

- Finance controllerlari `Tenant` ve `Roles` icin `@sakin/api-core` kullanacak sekilde guncellendi.
- `payment` webhook endpointi icin middleware exclusion korunarak tasindi.

## Smoke (Bu Ortamda)

Calistirilan komutlar:

```bash
npm --prefix apps/api-finance run build
npm --prefix apps/api-finance run dev
```

Sonuc:
- Komutlar `exit code 0`.
- Ortamda toolchain eksikligi nedeniyle scriptler placeholder modda; tam compile/typecheck CI/toolchain asamasinda aktiflestirilecek.
