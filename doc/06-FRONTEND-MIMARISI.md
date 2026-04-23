# 06 — Frontend Mimarisi

> Ilgili dokumanlar: 01-MIMARI-GENEL-BAKIS, 02-KIMLIK-DOGRULAMA, customer-expectations/EXPECTATION-BRIEF.md

---

## Neden Uc Ayri Uygulama

Uc tamamen farkli kullanici, farkli yetki, farkli domain. Tek uygulamada birlestirilmez:

- **Tenant admin** platform panelini gormemeli — baska firmalarin verisine erisim riski
- **Sakin** admin paneline erismemeli — finansal operasyon ekranlari sakin isi degil
- **Super admin** tenant'larin gunluk isini yapmaz — platform seviyesi yonetim ayri urun

Bu bir guvenlik ve urun karari. Her biri farkli domain'de, farkli deploy'da, farkli erisim kontroluyle calisir.

| Uygulama | Teknoloji | Kullanici | Domain | Amac |
|----------|-----------|-----------|--------|------|
| client/platform | Next.js 15 | SUPER_ADMIN (biz) | platform.sakin.com.tr | Firma/lisans/sistem yonetimi |
| client/admin | Next.js 15 | TENANT_ADMIN + STAFF | admin.sakin.com.tr (ileride tenant bazli) | Gunluk operasyon yonetimi |
| client/mobile | Expo SDK 53 | RESIDENT (sakin) | App Store / Play Store | Borc gorme, odeme, talep |

Her uygulama **bagimsiz deploy** edilir. Ortak UI paketi yok — her uygulama kendi bilesenlerini barindirir. Hepsi ayni API'ye baglanir, yetkilendirme API tarafinda yapilir.

---

## Admin Panel (client/admin)

Yonetim sirketinin gunluk is araci. "Excel'den kolay" olmali.

### Route Yapisi

```
/dashboard        → Genel ozet, KPI kartlari, hizli islemler
/sites            → Site/bina portfoyu
/units            → Daire yonetimi
/residents        → Sakin listesi ve yonetimi
/dues             → Aidat yonetimi (okuma)
/dues-create      → Aidat planlama
/payments         → Tahsilat takibi
/finance, /cash   → Tahsilat ve kasa/banka
/expenses         → Gider yonetimi
/announcements    → Duyuru yonetimi
/reports          → Raporlar
/users            → Tenant kullanici yonetimi (davet, rol)
/settings         → Tenant ayarlari
```

Erisim matrisi (TENANT_ADMIN vs STAFF) icin: `doc/role-access-policy.md`.

### Holding / Portfoy Gorunumu

Birden fazla bina yoneten firmanin ilk gordugu ekran:
- Tum binalari kapsayan genel finansal ve operasyonel ozet
- Toplam bakiye, bu ay tahsil edilen, bekleyen borc, doluluk orani
- Her bina kart olarak listelenir: ad, adres, aidat tutari, daire sayisi, yonetici
- "Binayi Yonet" butonu ile secilen binanin detay akisina gecis

### Aktif Bina Baglami

Musteri beklentisindeki en onemli UX pattern'i:
- Sol menude aktif bina karti gorunur
- Kullanici hangi bina uzerinde calistigini her an bilir
- Bina secimi degistiginde listelenen veri (sakin, aidat, gider, duyuru) o binaya gore filtrelenir
- Aktif bina `SiteProvider` uzerinden tum ekranlara aktarilir

### Bina Yonetimi Alt Modulleri

Aktif bina secildiginde kullanicinin erisecegi moduller:
- Daireler ve bagimsiz bolumler
- Sakin takibi
- Aidat ve tahakkuk
- Tahsilatlar
- Giderler
- Kasa ve banka (gelir-gider ozeti, net durum)
- Bina personeli
- SMS merkezi
- Bina ayarlari

### Tasarim Beklentileri (EXPECTATION-BRIEF'ten)

- Sol tarafta sabit navigasyon
- Ustte arama alani
- Bildirim ve profil alani
- Kart tabanli ozet ekranlar
- Liste + filtre + durum etiketi + aksiyon butonlari
- Modal veya yan panel ile hizli duzenleme
- Durum rozetleri (odendi, bekliyor, gecikti)
- Kritik aksiyonlar one cikan CTA butonlariyla

### Tenant Branding ve Yenilikci Tema

Her tenant kendi uygulamasi gibi hissetmeli. Ayni zamanda **modern ve yenilikci bir tema kullanmak pazarlama icin onemli** — potansiyel musterilere gosterildiginde "bu bizim urunumuz olsun" dedirtmeli.

- Tenant logosu sidebar'da ve login ekraninda gorunur
- Renk paleti tenant'a ozel olabilir (primary/secondary renkler)
- Modern, temiz, profesyonel gorunum — sektordeki eski gorunumlu yazilimlardan ayrilmali
- Ileride: custom domain destegiyle (`yonetim.firmadi.com.tr`)

### Neye Dikkat Edilmeli
- Excel'den gelen kullanici icin **sade** olmali — ozellik zenginligi degil, is yuku azalmasi
- Responsive tasarim: oncelik masaustu ama tablet kullanimi da olacak (saha personeli)
- STAFF rolu icin bazi menuler gizlenmeli (role-access-policy'ye gore)
- Performans: buyuk sakin listeleri icin sayfalama ve lazy loading
- Tema sistemi: koyu/acik mod degil, **tenant bazli branding**

---

## Platform Panel (client/platform)

Sakin ekibinin (bizim) kullandigi yonetim ekrani.

### Route Yapisi

```
/dashboard        → Platform ozet (toplam tenant, aktif lisans, sistem sagligi)
/tenants          → Tenant listesi, olusturma, durum yonetimi
/plans            → Lisans/plan yonetimi
/reports          → Platform raporlari (firma durumu, lisans, SMS, aktivite, hata)
/settings         → Sistem ayarlari (genel, lisans paketleri, SMS, bildirim, guvenlik, log)
```

### Musteri Beklentisinden Cikarimlar

Super admin tarafinda beklenen kabiliyetler:
- KPI kartlari: kayitli firma, aktif lisans, SMS kredi havuzu, guvenlik kaydi sayisi
- Firma bazinda detay: lisans bitis, SMS kotasi, aktif site/unite sayisi
- Rapor sekmeleri: firma durumu, lisans, SMS kullanim, sistem aktivite, hata ve saglik
- Sistem ayarlari: genel (logo, dil, saat dilimi), SMS saglayici, bildirim, guvenlik, log

### Neye Dikkat Edilmeli
- Admin panel ile **ayni tasarim dili** kullanilmali — farkli urun hissi vermemeli
- Tenant verilerine erisim super admin yetkisiyle — guard kontrolu kritik
- Rapor ve log ekranlari performans acisinda buyuk veri setleriyle test edilmeli

---

## Mobil Uygulama (client/mobile)

Sakinin elindeki minimal arac. Engagement urunu degil, **islevsel arac**.

### Tab Yapisi

```
Borclarim         → Aidat listesi, odenmis/odenmemis durumlar
Odemelerim        → Odeme gecmisi
Bildirimler       → Duyurular ve sistem bildirimleri
Profil            → Kisisel bilgiler, cikis
```

### Odeme Akisi

1. Sakin "Ode" butonuna basar
2. iyzico checkout formu WebView'da acilir
3. Kart bilgileri girilir (iyzico formunda)
4. Sonuc ekrani gosterilir
5. Borc listesi guncellenir

### Neye Dikkat Edilmeli
- Sakinin beklentisi **minimal**: borcumu gor, ode, ariza bildir — bitti
- Telefon OTP ile giris — email sormak surtuenme yaratir
- WebView odeme akisinda geri butonu davranisi test edilmeli
- Offline durumda anlamli hata mesaji gosterilmeli
- Push notification: odeme hatirlatma, duyuru, talep guncellemesi (Faz 2)

---

## Ortak Prensipler

### API Client
Her frontend'te API cagrilari icin merkezi bir client wrapper olmali:
- Token injection (Firebase token → Authorization header)
- Hata yakalama ve kullaniciya gosterme
- Loading/error state yonetimi

### @sakin/shared Tuketimi
Frontend'ler shared paketini build sirasinda kullanir:
- Zod semalari ile form validasyonu
- Enum'lar ile durum etiketleri
- Tipler ile tip guvenligi

### Neye Dikkat Edilmeli
- Uc uygulama tamamen farkli urunler — ortak UI bilesen paketi gereksiz
- shadcn/ui copy-paste mantigi ile calisir, her uygulama kendi bilesenlerini barindirir
- Frontend'lerde is mantigi **olmamali** — API'nin dondurdugu veriyi goster, hesaplama yapma
- Ortam degiskenleri (Firebase config, API URL) `.env` dosyalarinda tutulur, koda gomulmez
