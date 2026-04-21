# 16 — Faz 2 & Faz 3 Sprint Plani

> Ilgili dokumanlar: 08-OZELLIK-YOL-HARITASI, 07-TENANT-YASAM-DONGUSU, customer-expectations/EXPECTATION-BRIEF
>
> Bu dokuman, Faz 1 MVP tamamlandiktan sonraki gelistirme akisini milestone'lara ve sprintlere boler. Her milestone bagimsiz olarak "shippable" bir asamadir.

---

## Milestone Ozeti

| Milestone | Hedef | Sure | Cikis Kriteri |
|-----------|-------|------|---------------|
| **M1** | MVP Kapanisi | 4-5 hafta | Kendi sirketimiz tam operasyon, Excel bagimsiz |
| **M2** | Iletisim & Ticket | 4-5 hafta | Ilk harici pilot musteri alinabilir |
| **M3** | SaaS Hazirligi | 4-5 hafta | Self-serve, coklu musteri, satilabilir |

Toplam: ~12-15 hafta.

---

# M1 — MVP Kapanisi

**Hedef:** Kendi sirketimiz bu sistem uzerinde tam gun operasyon yuruttuyor. Excel'e ve Whatsapp'a geri donus yok.

**Baslangic durumu:**
- Faz 1 tamamlandi (aidat, odeme, ledger, temel CRUD'lar hazir)
- API'de cash-account, resident bulk import, unit bulk create endpointleri mevcut
- Admin panelinde sidebar dar, aktif bina baglami eksik, onboarding uzun

**Cikis kriteri:**
- Yonetim sirketi personeli sabah sistemi aciyor, gun sonu hicbir islemi Excel'e yazmadan tamamliyor
- Yeni site kaydi 5 dakikada tamamlaniyor (daireler + sakinler dahil)
- Aktif bina secimi kullanici kaybetmiyor, surekli gorunur

## S0 — Quick Wins (1 hafta)

Risk dusuk, UX etkisi yuksek. Milestone'a isinma.

**Issue'lar:**
- [ ] S0.1 — Sidebar'a **Duyurular** ve **Sakinler** menu itemi ekle
  - Dosya: `client/admin/src/lib/access-policy.ts`
  - Icon secimi: `Megaphone`, `Users`
  - Grup: "Yonetim" (sakinler), "Iletisim" (yeni grup, duyurular)
- [ ] S0.2 — Bildirim popover'inda kavramsal ayrim
  - Popover basligi: "Sistem Bildirimleri"
  - Alt CTA: "Yeni Duyuru" → `/announcements?new=1`
  - Duyuru ile sistem bildirimi karismasin
- [ ] S0.3 — Portfoy (sites) sayfasi tablo/kart toggle
  - Kart view: bina ikonu + ad + adres + daire sayisi + aidat + yonetici + "Binayi Yonet" CTA
  - Tablo view: mevcut operasyonel gorunum
  - Toggle state localStorage'da persist
- [ ] S0.4 — `sites/[id]` sayfasina breadcrumb
  - "Portfoy > {site.name}" yapisi
  - Her sekmeye (daireler, finans vb.) kolayca donebilme

**Kabul kriterleri:**
- 4 menu item ek, duyurular URL bilinmeden erisilebilir
- Portfoy sayfasi kart ve tablo arasinda gec gecis yapabiliyor
- Bildirim popover'inda duyuru ve sistem bildirimi kavramsal olarak ayrilmis

## S1 — Onboarding Sihirbazi (1-2 hafta)

**Neden oncelikli:** Kendi operasyonumuzda ilk siteyi eklerken en cok zaman kaybi burada. Ayrica her yeni pilot musteri icin defalarca kullanacagiz.

**Issue'lar:**
- [ ] S1.1 — Bina plani wizard'i (site create modal'i)
  - Yeni adim: "Blok sayisi × Kat sayisi × Kat basina daire"
  - Otomatik isimlendirme patterni secimi (A-1, A-2 / 101, 102 / 1-A, 1-B)
  - API: `POST /sites/:siteId/units/bulk` (mevcut)
  - Preview: olusacak daire listesi ornekleri
- [ ] S1.2 — Sakin CSV import UI
  - Sablon indirme butonu (ornek CSV)
  - Dosya yukleme + dry-run API cagrisi
  - Onizleme: "X yeni, Y guncelleme, Z hata" tablosu
  - Commit onayi
  - API: `POST /residents/import/dry-run`, `POST /residents/import/commit` (mevcut)
- [ ] S1.3 — Sakin tablo-edit modu
  - Her daire satirinda sakin bilgilerini inline edit (ad, telefon, OWNER/TENANT)
  - Tab tusuyla sonraki satira gecis
  - Kaydetme batched (her satir otomatik degil, toplu kaydet)
- [ ] S1.4 — Onboarding sihirbazi orkestrasyon
  - Route: `/onboarding/new-site` (3 adimli wizard)
  - Adim 1: Site bilgisi + bina plani
  - Adim 2: Sakin yukle (CSV veya tablo)
  - Adim 3: Ilk aidat olustur (opsiyonel)
  - Progress indicator + geri/ileri navigasyon

**Kabul kriterleri:**
- 50 daireli yeni site 5 dakikada hazir hale geliyor
- CSV import %100 dogruluk, dry-run ile hatalar net
- Mevcut tekli ekleme akisi bozulmadi

## S2 — Aktif Bina Hub'i (2 hafta)

**Neden sprint olacak kadar buyuk:** UX'in kalbine dokunuyor. Sol menuden sayfa akisina kadar her yer etkileniyor.

**Issue'lar:**
- [ ] S2.1 — Sidebar'a aktif bina karti
  - Dosya: `client/admin/src/components/sidebar-nav.tsx`
  - Kart icerigi: site adi, sehir, "X daire · %Y tahsilat · ₺Z borc" mini KPI
  - "Binayi Degistir" butonu (SiteSwitcher'i acar)
  - "Tum Portfoy" modu gostergesi
- [ ] S2.2 — URL-bazli site baglami
  - Route pattern: `/sites/:siteId/...` veya query `?siteId=`
  - Cookie fallback devam
  - Sayfa refresh'te bina korunuyor, URL paylasimi calisyor
- [ ] S2.3 — Portfoy modu ↔ bina modu toggle
  - Dashboard ve siteler sayfasi: portfoy modu varsayilan
  - Diger sayfalar: bina secimi zorunlu
  - Mod gostergesi ust barda net
- [ ] S2.4 — `sites/[id]` bina hub'i
  - Tabli sayfa: Ozet · Daireler · Sakinler · Finans · Personel · SMS · Ayarlar
  - Her tab mevcut sayfalarin scoped versiyonu
  - URL: `/sites/:siteId/units`, `/sites/:siteId/finance` vs.
- [ ] S2.5 — Breadcrumb alt modullerde
  - "Portfoy > Gunes Apt > Daireler" patterni
  - Her modul sayfasinda gorunur
  - Component: `client/admin/src/components/breadcrumb.tsx` (mevcut)

**Kabul kriterleri:**
- Kullanici hangi bina uzerinde calistigini her ekranda gorebiliyor
- URL paylasimi ve refresh aktif bina baglamini kaybetmiyor
- Bina ici navigasyon tab bazli, sayfalar arasi gecis hizli

## S3 — Kasa & Banka (1 hafta)

**Neden M1'de:** API hazir, beklenti belgesinde Faz 1-2 hibrit, MVP kapanisi icin gerekli.

**Issue'lar:**
- [ ] S3.1 — `/cash` sayfasi
  - Sidebar "Finans" grubuna ekle
  - Hesap listesi (nakit kasa, banka hesaplari)
  - Yeni hesap ekleme modal'i
- [ ] S3.2 — Islem akisi
  - Manuel gelir/gider girisi
  - Otomatik tahsilat kayitlari (odeme yapildiginda kasa girisi)
  - Filtre: donem, hesap, tip
- [ ] S3.3 — Bakiye ve ozet
  - Hesap bazli bakiye
  - Donem gelir-gider karti
  - Dashboard'da kasa ozet widget'i
- [ ] S3.4 — Odeme → kasa otomatik baglantisi kontrolu
  - Backend trigger var mi dogrula
  - Yoksa: `payment.service.ts` icinde payment confirmed olduğunda cash account entry olustur

**Kabul kriterleri:**
- Yonetici tek ekranda tum nakit ve banka durumunu goruyor
- Her odeme otomatik kasa girisi olusturuyor
- Manuel gider girisi kasa bakiyesini dusuruyor

---

# M2 — Iletisim & Ticket

**Hedef:** WhatsApp gruplarini kapatabilecek hale geliriz. Ilk harici pilot musteri alinabilir.

**Baslangic durumu:**
- M1 tamamlandi (kendi operasyon stabil)
- API'de ticket ve communication modulleri mevcut
- Mobil uygulama sakin tarafinda fonksiyonel

**Cikis kriteri:**
- Sakin ariza bildirimi uygulamadan yapiyor, WhatsApp grubu gereksiz
- SMS otomatik vade hatirlatmasi calisiyor
- Push notification kritik olaylarda devrede
- Pilot musteri kayit olup kullanmaya basliyor

## S4 — Ticket / Ariza Yonetimi (2 hafta)

**Issue'lar:**
- [ ] S4.1 — Admin ticket listesi
  - Route: `/sites/:siteId/tickets` (bina hub icinde)
  - Filtreler: durum, kategori, oncelik, atanan personel
  - Liste view + mobil-optimized kompakt view
  - Backend: `api/src/modules/ticket/` (mevcut)
- [ ] S4.2 — Ticket detay ekrani
  - Yorum akisi (timeline)
  - Durum degisimi: Acik → Islemde → Tamamlandi
  - Personel atama (dropdown, sonra site-staff modulu)
  - Fotograf galerisi (mevcut attachment endpoint)
- [ ] S4.3 — Mobil ticket olusturma
  - Kategori secimi (elektrik, temizlik, asansor, su, diger)
  - Aciklama + foto cekimi/yukleme
  - Oncelik secimi (acil/normal)
  - Dosya: `client/mobile/app/(tabs)/tickets/new.tsx`
- [ ] S4.4 — Mobil ticket takip
  - "Benim Bildirimlerim" listesi
  - Ticket detay: durum timeline, yorumlar
  - Push ile durum guncelleme bildirimi (S5'e bagli)

**Kabul kriterleri:**
- Sakin ariza bildirimi ortalama 30 sn'de gonderiyor
- Admin ticket ekranindan tum gun operasyonu yonetebiliyor
- Fotograf ekleme ve goruntuleme sorunsuz

## S5 — SMS Merkezi + Push (2 hafta)

**Issue'lar:**
- [ ] S5.1 — SMS sablon yonetimi
  - Sidebar "Iletisim" grubuna "SMS Merkezi"
  - Sablon CRUD: ad, govde, degisken `{isim}` `{tutar}` `{ay}`
  - Sablon onizleme
- [ ] S5.2 — Toplu SMS gonderimi
  - Hedef kitle secimi: tum site / gecikmeli / secili daireler / filtre
  - Sablon + degisken doldurma
  - Gonderim onceligi ve zamanlama
  - Gonderim gecmisi ve raporlama
- [ ] S5.3 — Otomatik borc hatirlatma
  - Cron: vade yaklastiginda SMS (7 gun, 3 gun, vade gunu, gecikme)
  - Tenant bazli on/off
  - Sablon tenant tarafindan ozellestirilebilir
- [ ] S5.4 — Tenant SMS kredi havuzu
  - Plan bazinda aylik kota
  - Dusuk kota uyarisi (%20, %10, %0)
  - Kota bittiginde fallback davranisi (gonderim durdur vs uyari ver)
- [ ] S5.5 — Firebase FCM entegrasyonu
  - Mobile'da token kayit ve yenileme
  - Backend: token store + topic management
  - Kritik bildirimler: odeme onay, ticket guncelleme, yeni duyuru
  - Kullanici bildirimlerini kategori bazli acip kapatabilsin

**Kabul kriterleri:**
- Sakin vade gunu otomatik SMS aliyor
- Push notification 5 saniye icinde gelilyor
- SMS maliyeti tenant kota ile kontrol altinda

## S6 — Personel + Refund (1-2 hafta)

**Issue'lar:**
- [ ] S6.1 — Bina personeli CRUD
  - Sidebar bina hub'inda "Personel" tab
  - Personel listesi: ad, rol, telefon, vardiya
  - Yeni personel ekleme
  - API: `api/src/modules/site-staff/` (mevcut)
- [ ] S6.2 — Vardiya planlama (basit)
  - Gun + saat araligi
  - Haftalik takvim view
  - Vardiya atama
- [ ] S6.3 — Gorev atama ve takip
  - Personele gorev atama (ticket atamasi bir form)
  - Personel bazli is yuku raporu
- [ ] S6.4 — iyzico refund
  - Admin UI: odeme detayinda "Iade" butonu
  - Kismi ve tam iade
  - Onay adim (2-step confirmation)
  - API: iyzico refund endpoint entegrasyonu (yeni)
- [ ] S6.5 — Refund sonrasi ledger + dues
  - Ledger reversal entry
  - Dues paidAmount dusumu, status recomputation
  - Sakine bildirim (push + SMS)

**Kabul kriterleri:**
- Personel takibi WhatsApp'dan bagimsiz yapilabiliyor
- Hatali odeme 2 dakikada iade ediliyor
- Iade sonrasi finansal durum tutarli

---

# M3 — SaaS Hazirligi

**Hedef:** Self-serve musteri kayit olup 1 gunde kullanmaya basliyor. Coklu musteri scale ediyor.

**Baslangic durumu:**
- M1 + M2 tamamlandi
- 1-2 pilot musteri aktif kullaniyor
- Oper geri bildirimleri ile urun olgunlasmis

**Cikis kriteri:**
- Satis yapilabilir, self-serve onboarding tamamlandi
- Olceklendirme ve izlenebilirlik hazir
- Musteriye guven veren rapor cikti ve branding mevcut

**Not:** Bu milestone M1/M2 bittikten sonra revize edilmeli — gercek musteri geri bildirimi kapsami degistirecek. Asagidaki plan baslangic iskeleti.

## S7 — Gelismis Raporlama (1-2 hafta)

**Issue'lar:**
- [ ] S7.1 — Tahsilat orani raporu
  - Ay bazli trend (son 12 ay)
  - Site bazli karsilastirma
  - Grafik + tablo
- [ ] S7.2 — Aging analizi
  - 0-30, 31-60, 61-90, 90+ gun borc dagilimi
  - Daire bazli drill-down
  - Ihtarname/takip icin filtre
- [ ] S7.3 — Site bazli mali durum
  - Gelir - gider - net durum
  - Donem karsilastirma
  - Butce sapma (eger butce tanimlandiysa)
- [ ] S7.4 — PDF rapor uretimi
  - Yonetim kuruluna sunulabilir sablon
  - Aylik/yillik otomatik olusturma secenegi
  - Email ile gonderim
- [ ] S7.5 — Excel export genisletme
  - Mevcut CSV'ye ek olarak xlsx
  - Sablon secenegi: muhasebe formatli
  - Donem ve filtre parametreleri

**Kabul kriterleri:**
- Yonetim kurulu toplantisi icin tek tikla PDF aliniyor
- Excel raporu mevcut muhasebe sistemine entegre edilebiliyor
- Tum raporlar 10 saniye altinda olusuyor

## S8 — Audit Log + Error Tracking (1 hafta)

**Neden kritik:** Para hassas alan. Kimin ne yaptigini izlemek regulasyon ve musteri guveni icin zorunlu.

**Issue'lar:**
- [ ] S8.1 — Audit log altyapisi
  - Her para ile ilgili islem (odeme, aidat, gider, iade) kaydediliyor
  - User + tenant + action + timestamp + before/after
  - Ayri tablo: `AuditLog` (immutable)
- [ ] S8.2 — Audit log UI
  - Super admin: tum tenant'lar
  - Tenant admin: kendi tenant'i
  - Filtre: kullanici, tip, tarih araligi
  - Export
- [ ] S8.3 — Error tracking
  - Sentry entegrasyonu (api, admin, mobile)
  - Source map upload
  - Slack/email alert kritik hatalar icin
- [ ] S8.4 — Structured logging (backend)
  - Pino veya winston
  - Request ID correlation
  - Log level environment bazli
- [ ] S8.5 — Backup/restore drill
  - PostgreSQL otomatik gunluk backup
  - Backup dosyasi off-site saklama (S3 vs)
  - Restore prosedur dokumantasyonu
  - Manuel drill (uretimdeki veriyi test DB'ye alip calistirdigini kontrol et)

**Kabul kriterleri:**
- Her finansal degisiklik audit log'da izlenebilir
- Production hatalari Sentry'de goruluyor, Slack'e alert
- Backup'tan restore 30 dakikada tamamlaniyor

## S9 — Branding + Kota Enforcement (1 hafta)

**Issue'lar:**
- [ ] S9.1 — Tenant branding
  - Tenant ayarlarina: logo upload, renk paleti (primary + accent)
  - Admin panelde tenant logosu topbar ve login'de
  - Mobil uygulamada tenant-bazli tema
  - Email/SMS sablonlarinda tenant logo
- [ ] S9.2 — Custom domain destegi
  - Tenant icin `{slug}.sakin.app` subdomain
  - Custom domain mapping (ileri asamada, DNS + SSL)
  - Super admin panelde yonetim
- [ ] S9.3 — Kullanim limit takibi
  - Plan bazli metrik: site sayisi, daire sayisi, SMS kotasi, kullanici sayisi
  - Tenant ayarlarinda mevcut kullanim gorunumu
  - Super admin'de tum tenant'larin kullanim tablosu
- [ ] S9.4 — Limit enforcement
  - Kota asildiginda grace period (7 gun uyari)
  - Grace sonrasi yeni kayit blokaji (mevcut data okunabilir kalsin)
  - Yukseltme teklifi modal'i
- [ ] S9.5 — Mobil branding
  - Dynamic config: tenant logo ve renk
  - Splash/login ekraninda gorunur
  - Store app icon tenant-bazli degistirilmiyor (tek app, tenant login ile bransh)

**Kabul kriterleri:**
- Tenant kendi logosu ve rengi ile sistemi kullaniyor
- Kota asimi otomatik uyari + upgrade akisina yonlendirme
- Super admin tum tenant kullanimini tek ekranda goruyor

## S10 — Self-Serve Onboarding + Marketplace (2 hafta)

**Issue'lar:**
- [ ] S10.1 — Firma kayit ekrani
  - Public web: `sakin.app/signup`
  - Form: sirket adi, yonetici email/telefon, plan secimi
  - Email dogrulama akisi
- [ ] S10.2 — Plan secimi + odeme
  - Plan karsilastirma ekrani (aylik/yillik)
  - iyzico checkout ile plan odemesi
  - Otomatik tenant olusturma (odeme confirmed oldugunda)
- [ ] S10.3 — Onboarding sihirbazi (self-serve)
  - Ilk giriste: ilk sitenizi olusturun → dairelerinizi tanimlayin → sakinlerinizi yukleyin → ilk aidatinizi olusturun
  - S1'deki onboarding sihirbazi ile butunlesik
  - Skippable adimlar + progress tracking
- [ ] S10.4 — iyzico sub-merchant + split payment
  - Tenant icin sub-merchant tanimlama
  - Odeme yapildiginda: tenant + platform komisyonu split
  - Komisyon orani plan bazli ayarlanabilir
- [ ] S10.5 — Abonelik yonetimi
  - Tenant ayarlarinda: aktif plan, yenileme tarihi, fatura gecmisi
  - Plan yukseltme/dusurme
  - Otomatik yenileme + basarisiz odeme retry
- [ ] S10.6 — Super admin musteri paneli
  - Yeni musteri basvurulari, abonelik durumlari, MRR trendi
  - Musteri bazli drilldown: kullanim, odeme gecmisi, support ticket
  - Manuel mudahale butonlari (plan degistirme, kota ayarlama)

**Kabul kriterleri:**
- Yeni musteri siteye girip 1 saat icinde sistemi kullanmaya basliyor
- Odeme akisi sub-merchant split ile calisiyor
- Super admin musteri saglik panelinden takip ediyor

---

## Kapsam Disi (Bilincli Olarak)

Bu konular M1-M3 dahilinde yok, gelecek plan:

- ERP/muhasebe entegrasyonu
- e-Fatura/e-Arsiv
- WhatsApp Business API (SMS oncelikli, WhatsApp sonraki asama)
- Yapay zeka/anomali tespiti
- Genel kurul/oylama sistemi
- Uluslararasilasma (coklu dil, coklu para birimi)

---

## Risk ve Bagimlilik Haritasi

**M1 → M2 bagimliligi:**
- S4 (Ticket) S2.4 (bina hub) uzerine oturuyor — hub tab olarak ticket
- S5 (Push) S4'un varligini gerektiriyor (ticket durum bildirimleri)

**M2 → M3 bagimliligi:**
- S7 (Rapor) S3 (Kasa) + S2 (bina baglami) verisine dayaniyor
- S10 (Self-serve) S9 (kota) enforcement'ina bagli

**Kritik riskler:**
- iyzico sub-merchant onay sureci (S10.4) — ~2-4 hafta iyzico tarafi, erken basvuru
- Firebase FCM setup (S5.5) — Apple APNs sertifika yenileme riski
- Custom domain + SSL (S9.2) — DNS ve sertifika altyapisi karmasik, M3'e bile gec kalabilir

---

## Revize Noktalari

- **M1 sonu:** Kendi operasyon verileri ile M2 oncelik revize (hangi feature en cok istendi?)
- **M2 sonu:** Pilot musteri geri bildirimleri ile M3 revize (gercek musteri ne istiyor?)
- **M3 sonu:** Faz 4 plani (olcekleme, iyilestirme, yeni ozellikler)

Bu dokuman yasayan bir dokumandir; her milestone sonunda guncellenir.
