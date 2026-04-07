# Sakin V2 Cutover Runbook (Production Safe)

## 1) Maintenance Window

1. Admin ve resident tarafında write işlemlerini maintenance mode ile durdurun.
2. Veritabanı snapshot/backups alın ve restore testinin hazır olduğundan emin olun.
3. Cutover commit SHA bilgisini release notuna sabitleyin.

## 2) Deploy + Schema

```bash
pnpm --filter @sakin/shared build
pnpm --filter @sakin/database db:generate
pnpm --filter @sakin/database db:migrate
pnpm --filter @sakin/api build
```

## 3) Backfill + Guards + Preflight

```bash
pnpm --filter @sakin/database db:cutover
```

Bu script sırasıyla:
- Preflight legacy kontrolü yapar (payment status varyantları, resident-unit legacy kolonları, tenant mismatch kontrolleri).
- Legacy ödeme durumlarını normalize eder (`SUCCESS/PAID -> CONFIRMED`, `CANCELED -> CANCELLED`).
- Gerekirse legacy `Resident->Unit` bağından `UnitOccupancy` backfill üretir (idempotent).
- Eksik `LedgerEntry(CHARGE|PAYMENT)` kayıtlarını idempotent üretir.
- Dues durumlarını ledger kalan borca göre yeniden hesaplar.
- `ledger_entries` append-only trigger guard’ını uygular.
- Tenant bazında fail-fast mutabakat doğrulaması yapar.

## 4) Verification SQL

DB üzerinde çalıştırın:

```sql
packages/database/prisma/sql/cutover_verification.sql
```

Beklenen:
- `payment_provider_events` içinde tenant+provider+event duplicate yok.
- `dues` içinde aynı unit/dönem duplicate yok.
- Tenant bazında charge/payment/net mutabakatı anlamlı ve beklenen aralıkta.

## 5) Smoke Checklist

1. Dues generate sonrası her dues için tek `CHARGE` ledger kaydı oluşuyor.
2. Checkout/manual confirm sonrası tek `PAYMENT` ledger kaydı yazılıyor.
3. Aynı webhook tekrarında ikinci finansal kayıt oluşmuyor (idempotent).
4. Resident yalnız kendi aktif occupancy birimi için `checkout`, `manual-bank-transfer`, `ledger/unit-statement` çağırabiliyor.
5. Dues açık borcu ve KPI ekranları ledger toplamlarıyla uyumlu.

## 6) Rollback

1. Trafiği kapalı tutun.
2. Snapshot’tan restore edin.
3. Önceki release artefaktına dönün.
4. Sağlık kontrolleri ve temel smoke testleri tekrar çalıştırın.
