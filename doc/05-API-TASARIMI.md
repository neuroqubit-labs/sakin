# 05 — API Tasarimi

> Ilgili dokumanlar: 02-KIMLIK-DOGRULAMA, 03-VERITABANI-SEMASI

---

## Genel Konvansiyonlar

- Base URL: `/api/v1`
- Basarili response: `{ "data": ... }`
- Hata response: `{ "statusCode": 400, "message": "...", "details": [...] }`
- Sayfalama: `?page=1&limit=20` → `{ "data": [...], "meta": { "total", "page", "limit", "totalPages" } }`
- Validasyon: Zod semalari (`@sakin/shared`) + NestJS pipe
- Swagger: `/api/docs` (sadece gelistirme ortami)

---

## Moduller

### auth
Kayit ve giris islemleri.
- `POST /auth/register` — yeni kullanici kaydi (Firebase UID ile)
- `POST /auth/dev-bootstrap` — gelistirme ortami baslangic verisi
- Bu endpoint'ler TenantMiddleware'den muaf

### site
Apartman/site yonetimi.
- CRUD: listele, olustur, guncelle, sil
- Sadece `TENANT_ADMIN`
- Site olusturulurken varsayilan aidat tutari tanimlanabilir

### unit
Daire/bagimsiz bolum yonetimi.
- CRUD + toplu olusturma (site'ye N daire ekle)
- Yazma: sadece `TENANT_ADMIN`
- Okuma: `TENANT_ADMIN` + `STAFF`

### resident
Sakin yonetimi.
- CRUD + soft delete
- `TENANT_ADMIN` + `STAFF` okur/yazar
- Soft delete: sadece `TENANT_ADMIN`

### occupancy
Sakin-daire iliskisi yonetimi.
- Tasima (move-in), cikis (move-out) islemleri
- Gecmis kayitlari listeleme

### dues
Aidat yonetimi — **en kritik modul**.
- Toplu aidat olusturma: site bazli, tum dairelere
- Tek daire aidat olusturma
- Durum guncelleme: WAIVED (affetme)
- Vadesi gecen borclari OVERDUE yapma (cron)
- Yazma (generate/update/waive/policy/period/bulk/overdue): sadece `TENANT_ADMIN`
- Okuma (list/detail): `TENANT_ADMIN` + `STAFF` (tahsilat baglami icin gerekli). `RESIDENT` yalniz kendi dairesini gorur.

### payment
Odeme islemleri.
- iyzico checkout baslatma
- Manuel tahsilat girisi (nakit, EFT)
- Webhook isleme (`POST /payments/webhooks/iyzico` — auth harici)
- Odeme listesi ve detay
- `TENANT_ADMIN` + `STAFF`

### ledger
Muhasebe kayitlari.
- Daire bazli bakiye sorgulama
- Ledger entry listesi (filtrelenebilir)
- Salt-okunur — dogrudan entry olusturma yok (payment/expense uzerinden olusur)
- `TENANT_ADMIN` + `STAFF` okur (tahsilat ve sakin iletisimi icin gerekli)
- `RESIDENT` yalnizca kendi dairesinin bakiyesini gorur

### expense
Gider yonetimi.
- CRUD: gider girisi, guncelleme, silme
- Kategori bazli filtreleme
- `TENANT_ADMIN` + `STAFF` (kritik silme haric)

### announcement
Duyuru yonetimi.
- CRUD: duyuru olustur, guncelle, sil
- Site bazli veya genel
- Mobil uygulamada sakinlere gosterilir

### export
Disa aktarma.
- CSV formatinda: tahsilatlar, aidatlar, muhasebe kayitlari
- Export gecmisi (batch) takibi

### tenant
Tenant is operasyonu.
- Work summary: KPI'lar (toplam borc, tahsilat, overdue)
- Work portfolio: site bazli ozet
- Gateway config: iyzico ayarlari
- Sadece `TENANT_ADMIN`

### platform
Platform yonetimi — sadece `SUPER_ADMIN`.
- Tenant CRUD: olustur, guncelle, aktif/pasif
- Plan yonetimi: TRIAL → BASIC → PRO → ENTERPRISE
- Platform istatistikleri
- PlatformGuard ile korunur

### notification
Uygulama ici bildirimler.
- Bildirim listesi, okundu isaretleme
- Okunmamis sayi
- Dahili tetikleme endpoint'i (TenantMiddleware harici)

---

## Yeni Modul Eklerken Checklist

1. NestJS module + controller + service olustur
2. Prisma model'i tanimla (tenant-scoped mi?)
3. `@sakin/shared`'a Zod sema + tip ekle
4. `@Roles()` decorator'lerini **her endpoint'e** koy
5. `app.module.ts`'ye import et
6. Swagger annotation'lari ekle
7. `role-access-policy.md`'yi guncelle

---

## Neye Dikkat Edilmeli

- Her endpoint'te `@Roles()` zorunlu — unutulan endpoint varsayilan olarak engellenir (guvenli)
- Validasyon icin **her zaman** Zod kullan, elle kontrol yapma
- Buyuk listeler icin sayfalama zorunlu — limitsiz sorgu yasak
- Hata mesajlari kullaniciya donuk olmali (Turkce, anlasilir)
- Finansal islemlerde islem oncesi ve sonrasi log onemli
- Webhook endpoint'lerine HMAC dogrulama sart
