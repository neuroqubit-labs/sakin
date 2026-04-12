# S1-06 Metadata Module Move (First Pass)

Bu not, `S1-06 | Move site/block/unit/resident/occupancy into api-metadata` kapsamindaki ilk tasima adiminin ozetidir.

## Tasinan Alanlar

- `site` modulu
- `unit` modulu (block route'lari dahil)
- `resident` modulu
- `occupancy` modulu
- Gerekli ortak yardimcilar:
  - `common/pipes/zod-validation.pipe.ts`
  - `common/finance/finance.utils.ts`
- Prisma katmani:
  - `prisma/prisma.module.ts`
  - `prisma/prisma.service.ts`

## AppModule Entegrasyonu

`apps/api-metadata/src/app.module.ts` icine eklendi:
- `PrismaModule`
- `SiteModule`
- `UnitModule`
- `ResidentModule`
- `OccupancyModule`

## Controller/Guard Uyumlama

- Metadata controllerlari `Tenant` ve `Roles` icin `@sakin/api-core` kullanacak sekilde guncellendi.
- `unit` tarafindaki block endpointleri metadata servisinin parcasi olarak korundu.

## Smoke (Bu Ortamda)

Calistirilan komutlar:

```bash
npm --prefix apps/api-metadata run build
npm --prefix apps/api-metadata run dev
```

Sonuc:
- Komutlar `exit code 0`.
- Ortamda toolchain eksikligi nedeniyle scriptler placeholder modda; tam compile/typecheck CI/toolchain asamasinda aktiflestirilecek.
