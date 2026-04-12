# S1-10 Sprint 1 Smoke Report

Bu rapor, `S1-10 | Produce sprint-1 smoke report` kapsaminda Sprint 1 sonunda zorunlu smoke maddelerini ve blocker durumunu kaydeder.

## Kapsam

- Finance kritik akis: `dues -> payment -> ledger` + notification side-effect
- Metadata kritik akis: CRUD + occupancy primary responsible
- Yeni servis bootstrap health kontrolu: `/health`

## Kanit Komutlari

Calistirilan komutlar:

```bash
node scripts/check-cross-service-imports.mjs --app api-finance
node scripts/check-cross-service-imports.mjs --app api-metadata
timeout 8s npm run dev:services
timeout 6s npm --prefix apps/api-auth run dev
timeout 6s npm --prefix apps/api-support run dev
```

Sonuc ozeti:

- Import guard:
  - `api-finance`: `passed (15 files scanned)`
  - `api-metadata`: `passed (12 files scanned)`
- Multi-service runner (`dev:services`) finance+metadata processlerini birlikte ayakta tuttu.
- Auth ve support shell processleri de ayaga kalkti.
- Bu ortamda socket bind izni olmadigi icin shell'ler `mock-shell mode` ile calisti.

## AC Durum Matrisi

- `dues -> payment -> ledger` + notification side-effect:
  - Durum: `PARTIAL`
  - Not: `S1-05` ve `S1-07b` implementasyonlari tamam; bu ortamda tam runtime E2E smoke kosulamadi.
- Metadata CRUD + occupancy primary responsible:
  - Durum: `PARTIAL`
  - Not: `S1-06` tasima tamam; bu ortamda endpoint-level smoke kosulamadi.
- Tum yeni servislerde `/health`:
  - Durum: `PARTIAL`
  - Not: Servis shell'lerinde `/health` route tanimli; ancak bu sandbox'ta `listen` engeli nedeniyle HTTP probe yapilamadi.

## Sprint 2 Blocker Listesi

1. Full runtime smoke icin socket bind + HTTP probe izinli ortamda tekrar test kosulmasi.
2. `api-finance` ve `api-metadata` icin placeholder build/typecheck scriptlerinin gerçek toolchain adimlarina alinmasi.
3. Notification side-effect ve metadata akislarinin endpoint-level otomatik smoke suite'e baglanmasi.

## Sonuc

- Sprint 1 backlog sirasindaki teknik altyapi adimlari tamamlandi.
- Smoke kapsamindaki davranislarin dogrulama zemini hazirlandi.
- Ortam limiti nedeniyle kalan smoke maddeleri Sprint 2'nin operasyon testlerinde kapatilacak sekilde blocker olarak tasindi.
