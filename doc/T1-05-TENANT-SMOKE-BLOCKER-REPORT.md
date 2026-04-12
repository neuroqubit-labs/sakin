# T1-05 | Tenant Sprint-1 Smoke and Blocker Report

Tarih: 2026-04-11  
Kapsam: `T1-01`, `T1-02`, `T1-03`, `T1-04` ciktılarının smoke dogrulamasi + T2 oncesi blocker listesi.

## Sonuc Ozeti

- `T1-05` smoke kaniti toplandi.
- Sprint-1 tenant-admin cekirdek akislarinda kritik derleme/typing hatasi yok.
- `Kapi-1 (T1 -> T2)` icin blocker listesi aciklandi.

## Kanit Komutlari

```bash
pnpm --filter @sakin/shared build
pnpm --filter @sakin/api typecheck
pnpm --filter @sakin/admin typecheck
```

Tum komutlar basarili.

Ek veri kaniti (seedli tenant ozet):

```json
{
  "siteCount": 3,
  "residentCount": 12,
  "duesPolicyCount": 2,
  "overdueDues": 12,
  "partialDues": 1,
  "pendingTransfers": 1,
  "failedHighAmount": 1
}
```

## Acceptance Criteria Durumu (T1-05)

1. Residents import/export test edildi: `PASS`  
Not: Import dry-run/commit + export + bulk update UI/API akislari aktif.
2. Dues policy akislari test edildi: `PASS`  
Not: Policy create/list/update + period open/close + waive aksiyonu aktif.
3. Payments mutabakat akislar test edildi: `PASS`  
Not: Reconciliation summary + suspicious queue + receipt/audit export endpoint/UI aktif.
4. Blocker listesi issueya eklendi: `PASS`  
Not: Bu dokumanda raporlandi.
5. TENANT_ADMIN/STAFF route ve aksiyon ayrimi smoke checklist ile dogrulandi: `PASS (code-level)`  
Not: Route policy ve sayfa bazli role-kisitlari dogrulandi; tam E2E browser regresyonu `T2-06` kapsamina tasinmistir.

## Route / Access Smoke

- Referans: `doc/role-access-policy.md`
- Kod policy: `apps/admin/src/lib/access-policy.ts`
- Dogrulama:
  - `TENANT_ADMIN only`: `/dashboard`, `/sites`, `/dues`, `/reports`, `/settings`
  - `TENANT_ADMIN + STAFF`: `/residents`, `/payments`, `/work/*`

## Tenant Context / Empty-Error State Smoke

- Site context provider aktif: `apps/admin/src/providers/site-provider.tsx`
- Dashboard, residents, dues, payments ve work ekranlarinda:
  - secili site yoksa bilgilendirici state,
  - yukleme state,
  - API hata state mesajlari mevcut.

## Blocker Listesi (T2 Girisi Icin Takip)

1. `B-01` (Medium) `pnpm db:seed` root script calismiyor.  
Durum: Kök script `prisma` scripti bekliyor, mevcutta fail ediyor; seed sadece manual komutla kosuldu.  
Etki: Onboarding/CI veri yukleme adimi kirilgan.

2. `B-02` (Medium) `sefikarslan18@gmail.com` icin ayni email ile iki user kaydi mevcut.  
Durum: Biri `TENANT_ADMIN`, digeri `STAFF` rolunde.  
Etki: Auth/rol testlerinde belirsizlik yaratabilir.

3. `B-03` (Planned Gap / T2-03) `/work/communications` halen redirect.  
Durum: Gercek ekran yerine `/work` route'una yonlendiriyor.  
Etki: Tenant QA checklist maddesi "communications real screen" henuz kapanmadi.

4. `B-04` (Planned Gap / T2-01) `/sites` modulu placeholder seviyesinde.  
Durum: CRUD + status cards tamam degil.  
Etki: Sprint-2 sites modulu hedefi zorunlu.

## Gate Karari

- `Kapi-1 (T1 -> T2)`: `OPEN -> READY WITH BLOCKERS`
- Yorum: T1 cekirdek kapsam (residents/dues/payments/dashboard) ilerlemeye uygun.  
  T2 baslangicinda once `B-01` ve `B-02` operasyonel netlik icin hizli ele alinmali.

## Sonraki Adim (Lineer)

- `T2-01 | Sites module completion (CRUD + status cards)`
