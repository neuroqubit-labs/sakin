# S1-08 Import Guard Enforcement

Bu rapor, `S1-08 | Enforce no cross-service direct imports` kapsamindaki fail-fast enforcement adimini kaydeder.

## Uygulanan Enforce Mekanizmasi

- Static check script:
  - `scripts/check-cross-service-imports.mjs`
- Root scriptleri:
  - `imports:guard:finance`
  - `imports:guard:metadata`
  - `imports:guard`
- Servis lint scriptleri:
  - `apps/api-finance/package.json -> lint`
  - `apps/api-metadata/package.json -> lint`

## Kural

- `api-finance` sadece `dues|payment|ledger|export` modul importlarina izin verir.
- `api-metadata` sadece `site|unit|resident|occupancy` modul importlarina izin verir.
- Relative import ile baska servis ownership'indeki `src/modules/*` hedeflenirse check `exit 1` ile fail eder.

## Komut Sonuclari

Calistirilan komutlar:

```bash
node scripts/check-cross-service-imports.mjs --app api-finance
node scripts/check-cross-service-imports.mjs --app api-metadata
npm --prefix apps/api-finance run lint
npm --prefix apps/api-metadata run lint
```

Sonuc:
- Tum komutlar `exit code 0`
- `api-finance`: `15 files scanned`
- `api-metadata`: `12 files scanned`

## S1-08 Acceptance Mapping

- Cross-service import kurali static check ile enforce ediliyor.
- Ihlal durumunda fail-fast (`process.exit(1)`) davranisi aktif.
- S1-05/S1-06 tasima seti uzerinde kural green durumda.
