# 04 — Odeme Sistemi

> Ilgili dokumanlar: 03-VERITABANI-SEMASI, 07-TENANT-YASAM-DONGUSU

---

## Genel Yapi

Uc odeme kanali vardir:

| Kanal | Kim Kullanir | Nasil Calisir |
|-------|-------------|---------------|
| Online kart (iyzico) | Sakin (mobil) | Kredi/banka karti ile anlik odeme |
| Banka transferi (EFT/havale) | Sakin | Banka uzerinden transfer, admin manuel onaylar |
| Nakit / POS | Sakin (ofiste) | Elden odeme, admin sisteme girer |

---

## iyzico Entegrasyonu

### Neden iyzico
- Turkiye'de en yaygin odeme altyapisi
- Marketplace (pazaryeri) modeli destekliyor — SaaS gecisinde komisyon kesmek icin gerekli

### Checkout Akisi

```
1. Sakin "Ode" butonuna basar (mobil)
2. API, iyzico'dan checkout form URL'si ister
3. Mobil uygulama bu URL'yi WebView'da acar
4. Sakin kart bilgilerini girer (iyzico formunda — biz kart bilgisi tutmayiz)
5. iyzico odemeyi isler
6. iyzico callback URL'sine yonlendirir
7. iyzico webhook ile API'ye sonucu bildirir
8. API, Payment + LedgerEntry olusturur
9. Dues durumu guncellenir (PAID veya kalan borc hesaplanir)
```

### Per-Tenant Gateway Config

Her tenant kendi iyzico merchant hesabini kullanir:
- Tenant olusturulurken iyzico API key + secret key tanimlanir
- Odeme istekleri bu tenant'in hesabindan islenir
- Para dogrudan tenant'in hesabina gider

### Neye Dikkat Edilmeli
- **Kart bilgisi asla bizde tutulmaz** — iyzico PCI-DSS uyumlu form kullanir
- Webhook HMAC-SHA256 ile dogrulanmali — sahte webhook'lar reddedilmeli
- Webhook endpoint'i TenantMiddleware'den muaf (iyzico'dan gelir, kullanici token'i yok)
- Ayni odeme icin birden fazla webhook gelebilir — idempotent islenmelidir
- Basarisiz odeme girisimleri (PaymentAttempt) takip edilmeli

---

## Manuel Tahsilat

Admin panelden girilen odemeler:

- **Nakit**: Ofise gelen sakin elden oder, admin sisteme girer
- **EFT/Havale**: Sakin bankadan transfer yapar, admin dekont kontrolu ile onaylar

Manuel tahsilatta:
1. Admin odeme bilgilerini girer (tutar, yontem, aciklama)
2. Payment kaydi olusur (status: COMPLETED)
3. LedgerEntry olusur (tip: INCOME)
4. Dues durumu guncellenir

### Neye Dikkat Edilmeli
- Manuel giriste tutar kontrolu onemli — fazla odeme girisi yapilabilir mi?
- Dekont/makbuz bilgisi saklanmali (referans no, aciklama)
- Kim girdigi (admin userId) loglanmali

---

## Marketplace Modeli (Faz 2)

Mevcut: Her tenant kendi iyzico hesabi, para dogrudan tenant'a gider.
Hedef: iyzico marketplace modeli ile split payment.

```
Sakin ödeme yapar (100 TL)
  → iyzico islemi yapar
  → 97 TL tenant'in sub-merchant hesabina
  → 3 TL platform komisyonu (Sakin hesabina)
```

Bunun icin:
- Her tenant bir iyzico sub-merchant olarak tanimlanir
- `subMerchantKey` alani zaten sema'da mevcut
- Komisyon orani TenantPlan'a gore degisebilir

### Neye Dikkat Edilmeli
- Marketplace gecisi tenant'larin mevcut iyzico hesaplariyla uyumlu olmali
- Komisyon oranlari seffaf olmali — tenant ne odedigini bilmeli
- Iki gelir kanali: SaaS abonelik ucreti + islem komisyonu

---

## Reconciliation

Tutarsizliklari yakalama mekanizmasi:

- **Stale attempt temizligi**: Belirli sure icerisinde tamamlanmamis odeme girisimleri kapatilir
- **Suspicious payment**: Tutar uyusmazligi, durum tutarsizligi gibi durumlar isaretlenir
- **Provider event loglama**: iyzico'dan gelen ham veriler saklanir — sorun ciktiginda debug icin

### Neye Dikkat Edilmeli
- Reconciliation cron olarak duzeni calistirilmali
- Suspicious isaretlenen odemeler admin panelde gorunmeli
- Otomatik duzeltme yerine admin'e bildirim + manuel onay tercih edilmeli (para hassas alan)

---

## Refund (Iade)

Beklenen akis:
1. Admin iade baslat (neden + tutar)
2. iyzico API'ye refund istegi gonder
3. Basarili → Payment durumu REFUNDED
4. Ters LedgerEntry olustur (EXPENSE)
5. Dues durumunu yeniden hesapla

### Neye Dikkat Edilmeli
- Kismi iade desteklenmeli mi? (ornegin 500 TL'lik odemenin 200 TL'si)
- Iade sonrasi Dues tekrar PENDING'e mi donmeli?
- Iade suresi iyzico tarafinda sinirli olabilir
