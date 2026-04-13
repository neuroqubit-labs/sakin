# 07 — Tenant Yasam Dongusu

> Ilgili dokumanlar: 01-MIMARI-GENEL-BAKIS, 04-ODEME-SISTEMI, 08-OZELLIK-YOL-HARITASI

---

## Tenant Nedir

Tenant = yonetim sirketi. Sakin platformunda her musteri bir tenant'tir.
Kendi sitelerini, dairelerini, sakinlerini ve finansal islemlerini yonetir.
Baska tenant'in verisini goremez.

---

## Yasam Dongusu

```
Olusturma → Yapilandirma → Operasyon → (Genisleme | Askiya Alma | Kapatma)
```

### 1. Olusturma

SUPER_ADMIN platform panelinden tenant olusturur:
- Firma adi, iletisim bilgileri
- Otomatik TRIAL plan atanir
- Ilk TENANT_ADMIN kullanicisi tanimlanir

### 2. Yapilandirma (Onboarding)

Tenant admin ilk giris yaptiginda su adimlar:
1. **Site olustur** — yonettigi apartman/siteyi tanimla
2. **Daireleri ekle** — blok (opsiyonel) + daireler
3. **Sakinleri tanimla** — mulk sahibi ve/veya kiraci
4. **Odeme ayarlarini yap** — iyzico API key tanimla
5. **Ilk aidati olustur** — toplu aidat tanimla, borclar acilir

Bu akis "sihirbaz" (wizard) seklinde yonlendirilmeli.

### 3. Operasyon

Gunluk is dongusu:
- Her ay aidat olustur
- Tahsilatlari takip et (online + manuel)
- Giderleri gir
- Sakin degisikliklerini isle
- Duyuru gonder
- Raporlari incele

### 4. Genisleme

Tenant buyudukce:
- Yeni site ekle (baska apartman/bina)
- Staff kullanici tanimla (personel)
- Plan yukselttir (TRIAL → BASIC → PRO)

### 5. Askiya Alma / Kapatma

- SUPER_ADMIN tenant'i askiya alabilir (`isActive: false`)
- Askiya alinan tenant'in kullanicilari giris yapamaz
- Veriler silinmez — tekrar aktif edilebilir
- Kalici kapatmada veri politikasi tanimlanmali (su an eksik)

---

## Plan Yonetimi

| Plan | Hedef | Ozellik Siniri |
|------|-------|----------------|
| TRIAL | Deneme | Sure sinirli, temel ozellikler |
| BASIC | Kucuk firma | Sinirli site/daire sayisi |
| PRO | Buyuyen firma | Daha fazla site, gelismis raporlama |
| ENTERPRISE | Buyuk firma | Sinirsiz, ozel destek |

Plan sinirlari su an tanimli degil — Faz 3'te implemente edilecek:
- Maksimum site sayisi
- Maksimum daire sayisi
- SMS kotasi
- Rapor cesitleri
- API rate limit

### Neye Dikkat Edilmeli
- Plan degisikligi aninda mevcut verileri etkilememeli (downgrade'de veri kaybi yok)
- Trial suresi doldugunda ne olur? Belirlenmeli: tamamen kilitle mi, salt-okunur mu?
- Plan + ozellik matrisi net tanimlanmali

---

## Odeme Gateway Yapisi

Her tenant kendi iyzico hesabini kullanir:
- API key, secret key, base URL tenant bazli saklanir
- Odeme istekleri bu credential'lar ile yapilir
- Para dogrudan tenant'in hesabina gider (Faz 1)
- Faz 2'de marketplace modeli ile platform komisyonu kesilir

### Neye Dikkat Edilmeli
- Gateway config olmayan tenant online odeme alamaz — admin panelde uyari gostermeli
- Credential'lar sifrelenmis saklanmali
- iyzico test/prod modu tenant bazli ayarlanabilmeli

---

## White-Label (Planli — Faz 3)

Her tenant kendi uygulamasi gibi hissetmeli:
- **Logo**: Sidebar ve login ekraninda gorunur
- **Renk paleti**: Primary/secondary renkler tenant'a ozel
- **Domain**: `yonetim.firmadi.com.tr` seklinde custom domain
- **Mobil**: Uygulamada tenant logosu ve adi gorunur

Teknik gereksinimler:
- Admin panel: login'de tenant tespiti (domain veya subdomain bazli)
- Tema sistemi: CSS degiskenleri ile runtime renk degisimi
- Domain: Vercel custom domain API veya wildcard subdomain

---

## SaaS Abonelik (Planli — Faz 3)

Mevcut: SUPER_ADMIN manuel plan atar.
Hedef: Self-serve abonelik yonetimi.

```
Firma kaydol → Plan sec → Odeme yap → Tenant otomatik olusur → Onboarding baslat
```

Iki gelir kanali:
1. **SaaS abonelik**: Aylik/yillik sabit ucret (plana gore)
2. **Islem komisyonu**: Her online odeme uzerinden kucuk yuzde (marketplace)

### Neye Dikkat Edilmeli
- Self-serve onboarding akisi surtuenmesiz olmali
- Odeme basarisiz olursa tenant ne yapabilir? Grace period?
- Fatura ve makbuz otomasyonu gerekecek
