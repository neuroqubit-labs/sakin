# Tenant Role UI - Sprint 1 P0 Execution Pack

Bu dokuman, lineer plandaki ilk kritik seti (`T1-01 -> T1-02 -> T1-03`) tek akis halinde uygulanabilir hale getirir.

Referanslar:
- Backlog: `doc/TENANT-ROLE-UI-2-SPRINT-BACKLOG.md`
- Issue kit: `doc/TENANT-ROLE-UI-ISSUE-KIT.md`
- Rol policy: `doc/role-access-policy.md`

## Uygulama Sirasi (S1 P0)

1. `T1-01` Residents bulk management + import/export
2. `T1-02` Dues policy + period governance
3. `T1-03` Payments audit + reconciliation

Zorunlu kural:
- Bir issue green olmadan siradaki issue implementasyonuna gecilmez.

## T1-01 Uygulama Paketi

Hedef:
- Residents ekranini tenant-admin icin toplu yonetim seviyesine cikar.

Teslimat parcasi:
- CSV import dry-run + preview + commit
- CSV export (filtreli)
- Bulk update action bar
- Satir bazli hata raporu

Minimum teknik cikti:
- Import endpoint(ler)i: dry-run ve commit ayri
- Export endpointi: aktif filtreyi korur
- UI: preview tablosu + hata satiri paneli + commit butonu
- UI: bulk action secimi (aktif/pasif + iletisim alanlari)

Kapanis kaniti:
- Tenant-admin ile import dry-run/commit basarili
- STAFF ile governance aksiyonu gorunmuyor/engelleniyor
- Empty/error state ekranlari dogru

## T1-02 Uygulama Paketi

Hedef:
- Dues tarafinda tenant-admin policy ve donem yonetimini urunlestir.

Teslimat parcasi:
- Site bazli varsayilan aidat/policy ayari
- Donem ac/kapat aksiyonlari
- Vade/policy formu
- Waive/onay akis kontrolu

Minimum teknik cikti:
- Policy ayar endpoint entegrasyonu
- Donem state degistiren aksiyonlar icin audit kaydi
- UI: form validation + state badge + onay modal

Kapanis kaniti:
- Tenant-admin ile policy guncelleme ve donem aksiyonu calisiyor
- STAFF ile ayni aksiyonlara erisim yok
- Tenant context disi id ile istek atildiginda guvenli hata donuyor

## T1-03 Uygulama Paketi

Hedef:
- Payments denetim/mutabakat gorunumunu tenant-admin icin karar destek seviyesine getir.

Teslimat parcasi:
- Gunluk/aylik reconciliation ozetleri
- Method/status dagilimlari
- Supheli/bekleyen/duplicate queue
- Makbuz + audit izi export

Minimum teknik cikti:
- Summary widget + breakdown bilesenleri
- Queue tablo filtreleri (tarih, durum, odeme yontemi)
- Export aksiyonlari (receipt/audit)

Kapanis kaniti:
- Reconciliation sayilari ayni filtrede tutarli
- Supheli queue deep-link ile acilabiliyor
- STAFF tarafinda policy degisimi yok, sadece operasyon/read siniri korunuyor

## PR Akis Kurali (S1 P0)

- PR-1: `T1-01`
- PR-2: `T1-02` (PR-1 merge sonrasi)
- PR-3: `T1-03` (PR-2 merge sonrasi)

Her PR zorunlu:
- Scope: tek issue
- Access policy checklist: tenant-admin verified + staff unchanged
- Smoke kaniti: route guard + tenant context + empty/error state

## S1 P0 Smoke Checklist (Issue-Bazli)

Her issue kapanisinda asagidaki 3 kontrol zorunlu:

1. Route guard kontrolu
   - `TENANT_ADMIN` yetkili rotada erisebiliyor
   - `STAFF` governance rotada fallback aliyor
2. Tenant context kontrolu
   - Dogru tenant id ile veri geliyor
   - Yanlis/eksik tenant durumunda kontrollu hata donuyor
3. Empty/error state kontrolu
   - Veri yokken bos durum mesaji
   - API hata durumunda kullaniciya anlamli hata mesaji

## S1 P0 Cikis Kriteri

`T1-01`, `T1-02`, `T1-03` tamamlandiginda:
- `T1-05` smoke raporu icin zorunlu kanit seti hazir olur.
- `Kapi-1 (T1 -> T2)` on kosulu teknik olarak saglanmis olur.
