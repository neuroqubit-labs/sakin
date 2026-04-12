# T2-06 | Tenant E2E Regression + Release Notes

Tarih: 2026-04-11  
Kapsam: `T2-01`, `T2-02`, `T2-03`, `T2-04`, `T2-05` tamamlama sonrasi tenant-admin/staff regresyon dogrulamasi ve release ozeti.

## 1) Regression Evidence

### Calistirilan teknik kontroller

```bash
pnpm --filter @sakin/shared build
pnpm --filter @sakin/api typecheck
pnpm --filter @sakin/admin typecheck
```

Sonuc: Tum komutlar basarili.

### Feature Regression Matrisi (T2)

1. `T2-01 Sites module completion`: `PASS`  
Site create/edit/archive/activate + status kartlari aktif.

2. `T2-02 Reports presets + saved filters`: `PASS`  
Hazir preset paketleri, kaydedilmis filtre uygulama/silme ve export akisi aktif.

3. `T2-03 Work communications real screen`: `PASS`  
Redirect kaldirildi; hedefli broadcast, dry-run ve gonderim gecmisi aktif.

4. `T2-04 Work residents/payments split pages`: `PASS`  
`/work/residents` ve `/work/payments` ayrik ekranlar + deep-link filtre aktif.

5. `T2-05 Work topbar actions completion`: `PASS`  
Bildirim merkezi, yardim paneli, profil menusu aktif.

### Role / Access Regression

- `TENANT_ADMIN only` route'lar: `/dashboard`, `/sites`, `/dues`, `/reports`, `/settings` korunuyor.
- `TENANT_ADMIN + STAFF` route'lar: `/residents`, `/payments`, `/work/*` korunuyor.
- Work split route'lar policy'ye eklendi: `/work/residents`, `/work/payments`.

## 2) E2E Coverage Notes

Bu ortamda browser tabanli otomatik E2E (Playwright/Cypress) suite tanimli degil.  
Bu nedenle T2-06 kapsami:

- build/typecheck + route/access + feature-level smoke kaniti ile tamamlandi.
- Tam browser E2E otomasyonu (login -> multi-page user journey) sonraki kalite adimi olarak onerilir.

## 3) Release Notes (Tenant UI S2)

### Tenant-Admin

- `Sites` modulu urun seviyesine cikarildi:
  - Site ekleme, duzenleme, arsive alma / tekrar aktive etme
  - Portfoy durum kartlari (aktif/arsiv/yuksek risk/toplam daire)
- `Reports` modulu genislendi:
  - Hazir preset rapor paketleri
  - Kaydedilmis filtreler (uygula/sil)
  - Collections odakli status + method filtreleri
- `Work Communications` gercek ekran:
  - Target bazli gonderim (tenant/site/unit/resident)
  - Dry-run alici onizlemesi
  - Gonderim gecmisi
- `Work split pages`:
  - Ayrik `Work Sakinler` ve `Work Odemeler` ekranlari
  - URL tabanli deep-link filtreler
- `Work topbar` aktif aksiyonlar:
  - Bildirim merkezi (unread badge dahil)
  - Yardim paneli
  - Profil menusu

### Staff

- Staff operasyon siniri korunarak work route'larinda ayrik operasyon gorunumleri aktif edildi.
- Governance/policy yetkileri tenant-admin tarafinda kaldi.

## 4) Known Risks / Follow-up

1. Browser-level otomatik E2E suite eksikligi  
Oncelik: `Medium`  
Etki: UI regression yakalama hizi manuel kontrole bagli.

2. `sefikarslan18@gmail.com` icin duplicate user kaydi (farkli firebaseUid)  
Oncelik: `Medium`  
Etki: Rol testlerinde hesap secimi karisabilir.

3. Kök `pnpm db:seed` komutunun ortamdan ortama kirilganligi  
Oncelik: `Medium`  
Etki: Yeni ortam onboarding adiminda manuel seed workaround gerekebilir.

## 5) Gate-2 Karari

- `Kapi-2 (T2 -> Release)`: `PASS (with known operational follow-ups)`
- Release-ready yorumu:
  - Tenant UI sprint-2 backlog hedefleri tamamlandi.
  - Uretim oncesi son adim olarak duplicate user temizligi ve db-seed standardizasyonu onerilir.
