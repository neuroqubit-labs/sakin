# 08 — Ozellik Yol Haritasi

> Ilgili dokumanlar: customer-expectations/EXPECTATION-BRIEF.md, 07-TENANT-YASAM-DONGUSU

---

## Faz 1 — MVP

Kendi sirketimizde calisir sistem. Altyapi iskeletleri mevcut, uretim kalitesine getirilmesi gerekiyor.

Faz 1 kapsamindaki ozellikler:
- Monorepo altyapisi (pnpm + Turborepo)
- Veritabani semasi (domain modelleri)
- Multi-tenant middleware (row-level isolation)
- Auth (Firebase email/phone + dev bypass)
- Site, Daire, Sakin, Occupancy yonetimi
- Aidat modulu (toplu uretim, overdue, waive, gunluk kontrol)
- Odeme modulu (iyzico checkout, manuel tahsilat, webhook)
- Muhasebe kaydi (degistirilemez ledger, bakiye turetimi)
- Gider ve duyuru modulleri
- Disa aktarma (CSV)
- Tenant is ozeti (KPI, portfolio)
- Platform modulu (tenant CRUD, plan yonetimi)
- Uygulama ici bildirim
- Admin panel ve mobil uygulama API entegrasyonu

---

## Faz 2 — Genisleme (Sirada)

Ilk harici musteri denemeleri baslatilabilir.

### Talep / Ariza Yonetimi
WhatsApp gruplarindaki dagnik iletisimi tek kanala toplama.

- Sakin mobilden talep olusturur
- Kategori secimi: elektrik, temizlik, asansor, su, diger
- Aciklama + fotograf ekleme
- Admin gorur, ilgili personele atar
- Durum takibi: Acik → Islemde → Tamamlandi
- Sakin durumu mobilden takip eder, bildirim alir

**Neye dikkat:** Basit tutmak onemli — ticket sistemi degil, ariza bildirimi. Kategori sayisi az, oncelik seviyesi (acil/normal) yeterli.

### Push Notification (Firebase FCM)
- Odeme hatirlatmasi (vade yaklasinca)
- Duyuru bildirimi
- Talep durumu guncellendi bildirimi
- Odeme tamamlandi onay bildirimi

**Neye dikkat:** Spam olmamali — kullanici bildirimi kapatirsa is akisi bozulmamali. Kritik bildirimler (odeme onay) ile genel bildirimler (duyuru) ayrilmali.

### SMS Entegrasyonu
- Toplu SMS gonderimi (site bazli veya secili sakinlere)
- Borc hatirlatma SMS'i (otomatik tetik opsiyonel)
- Sablon sistemi: "Sayin {isim}, {ay} ayi aidatiniz {tutar} TL'dir"
- Tenant bazli SMS kredi havuzu
- Gonderim gecmisi ve raporlama

**Neye dikkat:** SMS maliyetli — tenant'in kredi havuzu bitmeden uyari vermeli. Super admin SMS paketleri satarak gelir elde edebilir.

### Calisan Takibi
- Guvenlik, temizlik, bahce personeli tanimlama
- Vardiya planlama (basit: gun + saat araligi)
- Gorev atama ve durum takibi
- Ise geldi/gelmedi raporlamasi

**Neye dikkat:** Bu modulu basit tut — tam bir HR sistemi degil, sahada "kim nerede" takibi.

### Refund Otomasyonu
- iyzico API ile iade istegi gonderme
- Kismi ve tam iade destegi
- Iade sonrasi ledger ve dues guncelleme

### Admin Panel Iyilestirmeleri
- Responsive tasarim (tablet uyumu)
- Gelismis filtreleme ve arama
- Toplu islem (birden fazla daire sec → toplu SMS gonder)
- Dashboard KPI kartlarinin zenginlestirilmesi

---

## Faz 3 — SaaS (Planli)

Coklu musteri, self-serve, olceklenebilir platform.

### Raporlama
- Tahsilat orani (ay bazli, site bazli)
- Aging analizi (kac dairenin kac aylik borcu var)
- Site bazli mali durum (gelir - gider)
- Yonetim kuruluna sunulabilir PDF rapor
- Excel disa aktarma (mevcut CSV'yi genislet)

### Self-Serve SaaS Onboarding
- Firma kaydol ekrani (web)
- Plan sec + odeme yap
- Otomatik tenant olusturma
- Onboarding sihirbazi (site → daire → sakin → ilk aidat)

### Marketplace Odeme
- iyzico sub-merchant tanimlama
- Split payment: tenant'a para + platforma komisyon
- Komisyon oranlarinin plan bazli ayarlanmasi

### White-Label
- Tenant logosu + renk paleti
- Custom domain destegi
- Mobil uygulamada tenant branding

### Kullanim Limitleri
- Plan bazli: site sayisi, daire sayisi, SMS kotasi
- Limit asildiginda uyari + yukseltme teklifi
- Grace period: limit asilinca aninda kilitlemek yerine sureli uyari

---

## Kapsam Disi (Bilinçli Olarak)

Bu konulari tartismaya acmak bile zaman kaybi — odak korunmali:

- ERP / muhasebe entegrasyonu
- e-Fatura / e-Arsiv
- BI / analitik platform
- Yapay zeka ozellikleri
- Genel kurul / oylama sistemi
- Uluslararasilasma

---

## Musteri Beklentisi Eslestirmesi

| Musteri Beklentisi | Faz |
|-------------------|-----|
| Dashboard + KPI kartlari | Faz 1 |
| Site/bina portfoyu | Faz 1 |
| Holding / portfoy ozet gorunumu | Faz 1 |
| Aktif bina baglami (sol menude bina karti) | Faz 1 |
| Daire listesi + yonetim modali | Faz 1 |
| Aidat + tahsilat takibi | Faz 1 |
| Online odeme | Faz 1 |
| Sakin yonetimi | Faz 1 |
| Kasa ve banka (gelir-gider ozeti) | Faz 1-2 |
| SMS merkezi | Faz 2 |
| Talep/ariza bildirimi | Faz 2 |
| Calisan / bina personeli takibi | Faz 2 |
| Push bildirim | Faz 2 |
| Gelismis raporlama (PDF, Excel) | Faz 3 |
| Platform guvenlik/log merkezi | Faz 3 |
| Sistem ayarlari (detayli) | Faz 2-3 |
| Tenant branding (logo, renk, domain) | Faz 3 |
