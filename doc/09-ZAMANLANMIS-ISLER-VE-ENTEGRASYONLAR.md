# 09 — Zamanlanmis Isler ve Entegrasyonlar

> Ilgili dokumanlar: 04-ODEME-SISTEMI, 08-OZELLIK-YOL-HARITASI

---

## Zamanlanmis Isler (Cron Jobs)

### Overdue Kontrolu
- **Ne zaman:** Her gun gece yarisi
- **Ne yapar:** Vadesi gecmis ve odenmemis borclari OVERDUE olarak isaretler
- **Neye dikkat:** Tum tenant'lar icin calisir. Saat dilimi farki olursa yanlis vade hesabi olabilir — Turkiye tek saat dilimi oldugu icin su an sorun yok.

### Reconciliation (Odeme Uzlasma)
- **Ne zaman:** Duzeni araliklarla (ornegin her 6 saatte)
- **Ne yapar:** Belirli suredir tamamlanmamis odeme girisimleri (PaymentAttempt) kapatir
- **Neye dikkat:** Kapatmadan once iyzico'dan son durum sorgulanmali — belki odeme gerceklesti ama webhook gelmedi.

### Odeme Hatirlatma (Planli — Faz 2)
- **Ne zaman:** Vade gunundan X gun once
- **Ne yapar:** Borc hatirlatma SMS/push gonderir
- **Neye dikkat:** Tenant bazli acik/kapali ayarlanabilmeli. Her sakine her gun hatirlatma gondermek spam olur.

### Plan Sure Kontrolu (Planli — Faz 3)
- **Ne zaman:** Her gun
- **Ne yapar:** Trial suresi dolan tenant'lari tespit eder, uyari gonderir veya kisitlar
- **Neye dikkat:** Aninda kilitlemek yerine grace period uygulamak kullanici deneyimi icin onemli.

---

## Dis Servis Entegrasyonlari

### Firebase Auth
- **Ne icin:** Kimlik dogrulama
- **Nasil:** Firebase Admin SDK ile token dogrulama (her request)
- **Neye dikkat:** Firebase servis hesabi (service account) credentials guvende tutulmali. Rate limit Firebase tarafinda var ama bizim tarafta da katman olabilir.

### iyzico
- **Ne icin:** Online kart odemesi
- **Nasil:** REST API — checkout form olustur, sonuc sorgula, webhook al
- **Webhook guvenlik:** HMAC-SHA256 imza dogrulama. Imza uyusmazsa istek reddedilir.
- **Neye dikkat:**
  - Webhook endpoint'i TenantMiddleware disinda (auth yok, HMAC ile dogrulanir)
  - Ayni islem icin birden fazla webhook gelebilir — idempotent isle
  - Test/prod modu tenant bazli ayarlanabilmeli
  - Timeout: iyzico yanit vermezse kullaniciyi bilgilendir, arka planda tekrar dene

### SMS Provider (Planli — Faz 2)
- **Adaylar:** Netgsm, Twilio, veya yerli provider
- **Nasil:** REST API ile SMS gonderimi
- **Neye dikkat:**
  - Tenant bazli kredi havuzu — biten krediye acik uyari
  - Gonderim basari/basarisizlik logu tutulmali
  - Sablon sistemi: degisken interpolation ({isim}, {tutar}, {ay})
  - Super admin SMS paketi satis mekanizmasi

### Firebase FCM — Push Notification (Planli — Faz 2)
- **Ne icin:** Mobil bildirimler
- **Nasil:** Firebase Cloud Messaging API
- **Neye dikkat:**
  - Device token yonetimi — kullanici giris yaptiginda token kaydet
  - Token gecersiz olursa temizle
  - Bildirim tipleri: odeme, duyuru, talep — her biri farkli oncelik
  - Kullanici bildirim tercihlerini yonetebilmeli

### WhatsApp Business API (Planli — Faz 2-3)
- **Ne icin:** Sakinlere WhatsApp uzerinden iletisim
- **Nasil:** WhatsApp Business API (Meta) veya aracı provider
- **Neye dikkat:**
  - Maliyet yuksek — sadece kritik bildirimler icin (odeme hatirlatma, acil duyuru)
  - Template mesaj onayi gerekli (Meta onay sureci)
  - Spam kurallarina uyum zorunlu

---

## Entegrasyon Guvenlik Prensipleri

1. **API key'ler ortam degiskeninde tutulur** — koda gomulmez, repo'ya commit edilmez
2. **Webhook'lar imza ile dogrulanir** — HMAC veya benzeri mekanizma
3. **Dis servis timeout'u tanimlanir** — sonsuz bekleme yok, kullaniciya bilgi ver
4. **Retry mantigi** — gecici hata olursa (5xx, timeout) otomatik tekrar, kalici hatada (4xx) dur
5. **Loglama** — her dis servis cagrisi loglanir (istek, yanit, sure, sonuc)
6. **Circuit breaker** — servis surekli hata veriyorsa geciçi olarak devre disi birak, diger islemleri bloklama

---

## Neye Dikkat Edilmeli

- Her entegrasyon icin fallback senaryosu dusunulmeli (iyzico cokerse ne olur?)
- Cron job'lar birbirini bloklamamali — biri uzun surerse digeri beklememeli
- Dis servis credential'lari tenant bazli olabilir (iyzico) veya platform bazli (Firebase) — karistirma
- Yeni entegrasyon eklendiginde bu dokumana eklenmeli
