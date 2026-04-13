# 01 — Mimari Genel Bakis

> Ilgili dokumanlar: 02-KIMLIK-DOGRULAMA, 07-TENANT-YASAM-DONGUSU

---

## Neden Bu Sistemi Yapiyoruz

Sektor hala Excel ve WhatsApp uzerinde yuruyor. Bunu bizzat yasiyoruz:
- Aidat takibi Excel'de, her ay ayni dongu
- Ariza bildirimleri WhatsApp gruplarinda, hangisi takip edildi belli degil
- Gider kayitlari ayri defterde, ay sonu rapor hazirlama saatler suruyor
- Sakin odeme yapmak icin bankaya gidiyor veya ofise ugruyor

Mevcut alternatiflerin ya cok pahali, ya cok karmasik, ya da bolgeye yabanci oldugunu goruyoruz.

**Ilk musteri biziz.** Once kendi operasyonumuzu yonetecegiz, sonra benzer sirketlere SaaS olarak sunacagiz.

---

## Urun Felsefesi

- **Basitlik once**: Excel kullanan biri adaptasyon surtuenmesi yasamanmali
- **Seffaflik**: Her finansal hareket izlenebilir; yonetici de sakin de guvenmeli
- **Guvenilirlik**: Odeme ve borc sistemi hata affetmez — para hassas alan
- **Operasyon odakli**: Bu kisi bugun ne yapiyor, nasil kolaylasiyor
- **MVP'yi calistir, sonra buyut**: Calismayan ozellik zenginligi yerine calisan bir cekirdek

---

## Sistem Nedir

Sakin, bina yonetim sirketlerinin operasyonunu dijitallestiren bir SaaS platformudur.
Uc uygulama vardir:

1. **Admin Panel** — Yonetim sirketi personelinin kullandigi web uygulamasi. Aidat, tahsilat, gider, sakin, duyuru — her sey buradan yonetilir.
2. **Mobil Uygulama** — Daire sakinlerinin elindeki arac. Borc gorme, odeme, ariza bildirme.
3. **Platform Paneli** — Bizim (sistem sahibi) kullandigimiz yonetim ekrani. Tenant olusturma, lisans, sistem ayarlari.

Bu uc uygulama tek bir API'ye baglanir.

---

## Multi-Tenant Yapisi

Her yonetim sirketi bir "tenant"tir. Tek veritabani, satirlarda ayrim:

- Her tabloda `tenantId` kolonu vardir
- Her sorgu otomatik olarak tenant'a filtrelenir
- Bir tenant baska tenant'in verisini goremez, degistiremez

Bu ayrim **middleware katmaninda** yapilir — servisler tenant'i dusunmez, middleware halleder.

### Neye Dikkat Edilmeli
- Tenant filtresi atlanabilecek bir sorgu **asla** olmamali
- Yeni tablo eklendiginde tenant-scoped mi degil mi karari verilmeli
- Platform (SUPER_ADMIN) sorgulari tenant filtresi disindadir — bunlar ozel guard ile korunur

---

## Rol Modeli

Uc katman:

| Katman | Rol | Kim | Nereye Erisir |
|--------|-----|-----|---------------|
| Platform | `SUPER_ADMIN` | Biz (Sakin ekibi) | Platform paneli, tum tenant verileri |
| Tenant | `TENANT_ADMIN` | Yonetim sirketi yoneticisi | Admin panel — tam yetki |
| Tenant | `STAFF` | Yonetim sirketi personeli | Admin panel — sinirli yetki |
| Sakin | `RESIDENT` | Daire sakini | Mobil uygulama |

> Detay: bkz. 02-KIMLIK-DOGRULAMA-VE-YETKILENDIRME.md

---

## Domain Modeli

```
Tenant (Yonetim Sirketi)
└── Site (Apartman / Site)
    └── Block (Blok — opsiyonel, buyuk sitelerde)
        └── Unit (Daire / Bagimsiz Bolum)
            ├── Resident (Sakin: OWNER veya TENANT)
            ├── Dues (Aidat borcu — ay bazli)
            │   └── Payment (Odeme: kart, nakit, EFT)
            └── LedgerEntry (Muhasebe kaydi — degistirilemez)
```

### Kritik Kural: Finansal Varlık = Daire

Borc daireye yazilir, kisiye degil. Kiraci degisir, dairenin borc gecmisi bozulmaz.
Bakiye **asla** bir kolonda tutulmaz — her zaman LedgerEntry toplamından turetilir.

### Neye Dikkat Edilmeli
- Daire (Unit) finansal merkezdir. Sakin degistiginde borc tasinmaz.
- Balance hesabini kolona yazmak yerine ledger aggregation kullan
- Ayni daire + ayni ay icin iki kez aidat olusturulamaz (idempotent)
- LedgerEntry sadece INSERT — UPDATE/DELETE yok

---

## Request Yasam Dongusu

```
HTTP Request
  → TenantMiddleware (token dogrula → kullanici bul → tenant belirle)
    → RolesGuard (yetki kontrol)
      → Controller (input validasyon)
        → Service (is mantigi)
          → DB (otomatik tenant filtresi)
```

Her katmanin tek bir sorumlulugu var. Servis katmani tenant'i bilmez — middleware inject eder, Prisma filtreler.

---

## Deployment

| Bilesen | Nerede | Neden |
|---------|--------|-------|
| API | Render | Node.js native, Docker gereksiz, managed |
| Admin Panel | Vercel | Next.js native destek, monorepo uyumlu |
| Platform Panel | Vercel | Ayni — farkli domain (admin.sakin.com.tr vs platform.sakin.com.tr) |
| Mobil | EAS Build | Expo native, App Store + Play Store |
| Veritabani | PostgreSQL (managed) | Render veya ayri provider |

### Neye Dikkat Edilmeli
- Docker su asamada kullanilmiyor — managed servisler yeterli
- Her frontend bagimsiz deploy edilebilmeli
- API tek monolith — mikroservise bolme planlanmiyor
- Ayri repoya tasima ihtimali var — `@sakin/shared` paketi bu yuzden onemli

---

## Paylasilan Kontrat: @sakin/shared

Tum uygulamalar arasi tip guvenligi icin tek kaynak:

- **Enum'lar**: UserRole, DuesStatus, PaymentMethod, PaymentStatus...
- **Zod semalari**: Her domain icin validasyon semalari
- **Tipler**: TenantContext, ApiResponse, PaginatedResponse

API bir sey degistirdiginde shared'i gunceller → frontend derleme hatasi alir → uyumsuzluk uretim oncesi yakalanir.

### Neye Dikkat Edilmeli
- Yeni bir alan eklendiginde once shared'a yaz, sonra API ve frontend'e
- Shared hicbir zaman runtime bagimliligi tasimamali (sadece tip + sema)
- Frontend'ler shared'i build sirasinda tuketir, canlida ayri paket deploy edilmez
