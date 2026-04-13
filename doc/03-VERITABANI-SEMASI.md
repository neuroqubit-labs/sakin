# 03 — Veritabani Semasi

> Ilgili dokumanlar: 01-MIMARI-GENEL-BAKIS, 04-ODEME-SISTEMI

---

## Tasarim Felsefesi

- **Daire (Unit) merkez varlik**: Tum finansal islemler daireye baglidir, kisiye degil
- **Iki eksen**: Yapisal (Tenant → Site → Block → Unit) ve zamansal (UnitOccupancy: kim ne zaman oturdu)
- **Degistirilemez muhasebe**: LedgerEntry sadece INSERT — duzeltme icin ters kayit girilir
- **Idempotent aidat**: Ayni daire + ayni ay icin iki kez aidat olusturulamaz

---

## Model Gruplari

### Organizasyon

**Tenant** — Yonetim sirketi. Sistemdeki en ust varlik.
- Adi, iletisim bilgileri, logo
- `isActive` — askiya alinabilir
- Tum alt kayitlar bu tenant'a baglidir

**User** — Sisteme giris yapan herkes. Firebase UID ile eslenir.
- Bir kullanici birden fazla tenant'ta rol alabilir
- `isActive` — hesap kapatilabilir

**UserTenantRole** — Kullanicinin hangi tenant'ta hangi rolde oldugu.
- Bir kullanici ayni tenant'ta tek rol alabilir
- `isActive` ile gecici olarak devre disi birakilabilir

### Fiziksel Yapi

**Site** — Apartman, site veya bina. Bir tenant'in yonettigi fiziksel konum.
- Adres, aidat tutari, yonetici bilgisi
- Daire sayisi buradan turetilir

**Block** — Blok. Opsiyonel, sadece buyuk sitelerde kullanilir.
- Site'ye baglidir
- Kucuk apartmanlarda Block olmadan dogrudan Unit'ler Site'ye baglanir

**Unit** — Daire veya bagimsiz bolum. **Finansal merkez**.
- Kat, numara, tip bilgisi (daire, dukkan, ofis vb.)
- Her turlu borc ve odeme buraya yazilir
- Bos olabilir (sakin atanmamis)

### Kisiler

**Resident** — Daire sakini. Mulk sahibi (OWNER) veya kiraci (TENANT).
- TC kimlik, telefon, email gibi temel bilgiler
- Silindiginde fiziksel olarak degil, isaretlenerek kaldirilir (soft delete) — finansal gecmis korunmali
- Bir dairede ayni anda bir sahibi ve bir kiracisi olabilir

**UnitOccupancy** — Sakin-daire iliskisinin zaman ekseni.
- `moveInDate`, `moveOutDate` ile oturma suresi takip edilir
- Ayni anda bir dairede aktif olan tek kayit olmali
- Kiraci degistiginde eski kayit kapatilir, yeni kayit acilir

### Neye Dikkat Edilmeli
- Sakin degistiginde eski borclar daireye bagli kalir — tasinmaz
- Sakin silme fiziksel degil — finansal gecmis korunmali
- Bos dairenin de borcu olabilir (ortak giderler)

### Finansal

**DuesDefinition** — Aidat tanimi. "Nisan 2026, site geneli 500 TL" gibi toplu tanim.
- Site bazli olusturulur
- Her olusturmada tum daireler icin Dues kaydi acilir

**Dues** — Tek bir dairenin tek bir aya ait borcu.
- Ayni daire + ayni ay icin yalnizca bir borc kaydi olabilir (idempotent)
- Durumlari: PENDING → PAID / OVERDUE / WAIVED
- Toplam borc ve odenen tutar ayri takip edilir
- Tam odendiginde PAID, vadesi gectiginde OVERDUE, affedildiginde WAIVED

**Payment** — Odeme kaydi.
- Bir Dues'a baglidir
- Yontem: CREDIT_CARD, BANK_TRANSFER, CASH
- Durum: PENDING → COMPLETED / FAILED / REFUNDED
- iyzico referans bilgileri (online odemeler icin)

**PaymentAttempt** — Odeme girisimi. Basarisiz denemeleri de tutar.
- Checkout olusturuldu ama odeme tamamlanmadi senaryolari

**PaymentProviderEvent** — Odeme saglayicisindan gelen ham webhook verileri.
- Debug ve reconciliation icin saklanir

**LedgerEntry** — Muhasebe kaydi. **Degistirilemez**.
- Her odeme ve gider icin kayit olusur
- Tip: INCOME (tahsilat) veya EXPENSE (gider)
- Bakiye = SUM(INCOME) - SUM(EXPENSE) — kolon olarak tutulmaz
- Duzeltme gerekirse ters kayit girilir (storno)

**Expense** — Gider kaydi. Asansor bakimi, temizlik, elektrik faturasi vb.
- Site bazli
- Kategori, tutar, aciklama, belge

### Neye Dikkat Edilmeli
- Balance kolonuna yazma cazibesine kapilma — her zaman ledger'dan hesapla
- LedgerEntry'de UPDATE/DELETE yasak — PostgreSQL trigger ile korunmali
- Odeme iptalinde Payment durumu REFUNDED olur, ayri bir ters LedgerEntry girilir
- Dues'un `paidAmount`'i Payment'lardan turetilmeli, elle set edilmemeli

### Platform

**TenantPlan** — Tenant'in abonelik plani.
- TRIAL, BASIC, PRO, ENTERPRISE
- Baslangic ve bitis tarihi
- Gecerli plana gore ozellik kisitlamalari uygulanabilir

**TenantPaymentGatewayConfig** — Tenant'in odeme saglayici ayarlari.
- Her tenant kendi iyzico hesabini kullanir
- API key, secret key, base URL
- Marketplace gecisinde sub-merchant bilgisi de bu kayitta tutulur

### Sistem

**AuditLog** — Islem logu. Kim ne zaman ne yapti.
- Kritik islemler icin otomatik kayit

**Notification** — Uygulama ici bildirim.
- Okundu/okunmadi durumu
- Push notification ile ayni degil — bu uygulama ici

**Announcement** — Duyuru. Yonetimden sakinlere.
- Site bazli veya genel
- Mobil uygulamada gorunur

**ExportBatch** — Disa aktarma kaydi.
- CSV/PDF export islemleri loglanir

---

## Planli Yeni Modeller

Bu modeller yol haritasinda yer aliyor (bkz. 08-OZELLIK-YOL-HARITASI):

- **Ticket** — Talep/ariza bildirimi. Kategori, oncelik, atama, durum takibi. Site bazli, tenant-scoped.
- **Employee** — Bina personeli. Guvenlik, temizlik, bahce. Vardiya ve gorev takibi. Site bazli.
- **SMSLog** — SMS gonderim gecmisi. Alici, sablon, durum, maliyet. Tenant bazli kredi havuzu takibi icin.

---

## Yeni Model Eklerken Checklist

1. Bu model bir tenant'a mi ait? → Tenant-scoped olarak tasarla
2. Silindiginde gecmisi korunmali mi? → Soft delete uygula
3. Ayni kaydin tekrar olusturulmasi engellenmeli mi? → Benzersizlik kurali belirle
4. Kim ne zaman degistirdi bilgisi gerekli mi? → Audit log ekle
5. API kontrati kirilmasin → Paylasilan sema/tip guncelle
