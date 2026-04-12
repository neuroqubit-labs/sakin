# Musteri Beklenti Dokumani

Bu dokuman, `doc/customer-expectations/images/` altindaki gorsellerden hareketle hazirlanmistir.
Amac, mevcut sistemi degerlendirmek degil; musterinin super admin ve tenant/firma yoneticisi tarafinda nasil bir urun bekledigini netlestirmektir.

## 1. Genel urun beklentisi

Gorseller, iki ana rolde ortak bir urun dili beklendigini gosteriyor:

- Sol tarafta sabit bir ana navigasyon
- Ustte hizli arama alani
- Bildirim ve profil alani
- Kart tabanli ozet ekranlar
- Liste, filtre, durum etiketi ve aksiyon butonlariyla yonetim deneyimi
- Modal veya yan akis yerine ekrandan kopmadan hizli duzenleme
- Duruma gore genisleyen baglamsal menu yapisi

Arayuz dili, klasik CRUD ekranindan cok "yonetim paneli + operasyon merkezi" hissi veriyor.

## 2. Rol bazli beklenti

### 2.1 Super Admin beklentisi

Super admin tarafi, platformun tamamini yoneten merkez rol olarak kurgulanmis gorunuyor.

Beklenen ana kabiliyetler:

1. Platform dashboard'u
- Hos geldin alani ve rol vurgusu
- Kayitli firma, aktif lisans, SMS kredi havuzu ve guvenlik kayitlari gibi ust seviye KPI kartlari
- Son sistem hareketlerini gosterme
- Hizli islem butonlariyla yonetim aksiyonlarini baslatma

2. Sirket/Firma yonetimi
- Sistemdeki tum firmalari listeleme
- Firma adi, yonetici veya e-posta ile arama
- Duruma gore filtreleme
- Yeni firma tanimlama
- Firma bazinda lisans bitis tarihi, SMS kotasi, aktif site ve unite sayisi gibi operasyonel bilgileri gorme

3. Analiz ve raporlama
- Tarih araligi secimi
- Firma secimi
- Durum filtresi
- Raporu ekranda gosterme
- Excel ve PDF disa aktarma
- En az su rapor sekmeleri bekleniyor:
  - Firma durumu
  - Lisans raporu
  - SMS kullanim
  - Sistem aktivite
  - Hata ve saglik

4. Sistem ayarlari
- Genel ayarlar
- Lisans ve paket yonetimi
- SMS paketleri
- Bildirim ayarlari
- Mail ayarlari
- Guvenlik
- Log ve bakim

Gorunen alanlara gore "Genel Ayarlar" altinda su beklentiler net:

- Sistem adi
- Logo veya marka gorseli
- SMS saglayici secimi
- SMS API kimlik bilgileri
- Varsayilan dil
- Saat dilimi
- Kaydet aksiyonu

5. Guvenlik ve log merkezi
- Giris ve oturum takibi
- Islem loglari
- Yetki ve ihlal takibi
- Guvenlik ayarlari
- Teknik hata gorunumu
- Kritik tehdit sayisi ve sistem guvenligi ozeti
- Kullanici veya islem bazli arama
- Zaman filtresi

### 2.2 Tenant / Firma Yonetici beklentisi

Tenant tarafi, tek bir daire kullanicisindan cok; portfoy ve bina yoneten "firma admin" veya "isletmeci" rolu gibi tasarlanmis.

Beklenen ana kabiliyetler:

1. Holding / portfoy ozet ekrani
- Tum binalari kapsayan genel finansal ve operasyonel ozet
- Toplam bakiye
- Bu ay tahsil edilen tutar
- Bekleyen borc
- Doluluk orani
- Detayli islem icin aktif bina secme akisi

2. Bina ve site portfoyu
- Yonetimdeki binalari kart yapisiyla listeleme
- Yeni bina ekleme
- Kart uzerinde en az su bilgileri gorme:
  - Bina/site adi
  - Adres
  - Aidat tutari
  - Daire/unite adedi
  - Yonetici bilgisi
- "Binayi yonet" benzeri bir CTA ile secilen bina detay akisini baslatma

3. Aktif bina baglami
- Sol menude aktif bina karti
- Kullaniciya hangi bina uzerinde calistigini gosterme
- Bina secimi degistiginde alt menulerin buna gore anlam kazanmasi

4. Daireler ve bagimsiz bolumler
- Daire/bagimsiz bolum listesini tablo halinde gorme
- Kat ve tip bilgisi
- Mulk sahibi bilgisi
- Kiraci bilgisi
- Toplam borc
- Durum bilgisi (or. bos)
- Her satir icin islem alani

5. Daire yonetimi
- Daire bazli yonetim popup'i / modal'i
- Mulk sahibi, kiraci ve bos durumlari arasinda gecis
- Mulk sahibi ve sakin bilgilerini guncelleme
- Telefon ve kimlik gibi temel alanlar
- Guncel borc ozetini gorme
- Durum rozeti (or. temiz)
- Degisiklikleri kaydetme

6. Bina yonetimi alt modulleri

Aktif bina secildiginde kullanicinin su modullere inebilmesi bekleniyor:

- Daireler ve bolumler
- Sakin takibi
- Finansal islemler
- Aidat ve tahakkuk
- Tahsilatlar
- Giderler
- Kasa ve banka
- Bina personeli
- SMS merkezi
- Ayarlar

7. SMS merkezi
- Tenant tarafinda ayri bir SMS merkezi modulu beklentisi var
- Ekran su an "gelistirme asamasinda" mesaji veriyor
- Bu nedenle gorselden kesin cikan beklenti, modulun menude gorunmesi ve ileride ayri bir is akisina sahip olmasi

## 3. Gorsellerden cikan UX beklentileri

- Super admin ve tenant tarafi ayni tasarim sistemini paylasmali
- Durumlar rozetlerle okunakli bicimde gosterilmeli
- Kritik aksiyonlar mavi veya koyu CTA butonlariyla one cikmali
- Filtreleme ve arama, liste ekranlarinin temel parcasi olmali
- Kart, tablo ve modal kullanimi tutarli olmali
- Rol ve baglam bilgisi her ekranda gorunur olmali
- Ekranlar "islem yapma" odakli; sadece rapor gosteren degil, yonetim yaptiran yapida olmali

## 4. Gorsellerden tam cikmayan ama netlestirilmesi gereken noktalar

Bu baslik, beklentiyi daha netlestirmek icin urun toplantisinda sorulmasi gereken konulari listeler:

1. Tenant rolu tam olarak ne? Firma admin, site yoneticisi, operasyon sorumlusu ya da bunlarin kombinasyonu mu?
2. Holding gorunumu her tenant icin mi var, yoksa sadece birden fazla bina yoneten firmalarda mi aciliyor?
3. "Sakin takibi" modulu hangi detaylari kapsiyor? Sadece kimlik ve iletisim mi, yoksa kontrat, tasinma, uye kayitlari gibi akislar da var mi?
4. Finansal islemler altinda gorunen moduller icin beklenen temel operasyonlar neler?
5. SMS merkezi sadece toplu bildirim mi, yoksa sablon, hedef kitle, otomatik tetik ve raporlama da iceriyor mu?
6. Guvenlik merkezi sadece log izleme mi, yoksa alarm, aksiyon alma ve politika yonetimi de bekleniyor mu?
7. Super admin raporlarinda hangi kolonlarin ve metriklerin zorunlu oldugu netlestirilmeli.

## 5. Ozet

Gorseller, iki katmanli bir urun beklentisi ortaya koyuyor:

- Super admin katmani: platform, firma, lisans, rapor, sistem ayari ve guvenlik yonetimi
- Tenant/firma yonetici katmani: portfoy, bina, daire, sakin ve finans operasyonu yonetimi

Kisacasi musteri, yalnizca veri gosteren ekranlar degil; rol bazli, operasyon yoneten, modern ve olgun bir SaaS arayuzu bekliyor.

## 6. Kaynak ekran listesi

Not: Gorsel setinde birebir tekrar eden ekranlar bulunuyor. Asagidaki liste, beklenti dokumanini besleyen ana ekran tiplerini ozetler.

1. Super Admin / Kontrol Paneli
- `doc/customer-expectations/images/WhatsApp Image 2026-04-06 at 11.51.53.jpeg`

2. Super Admin / Kurumsal Portfoy
- `doc/customer-expectations/images/WhatsApp Image 2026-04-06 at 11.52.07.jpeg`

3. Super Admin / Sistem Ayarlari / Genel Ayarlar
- `doc/customer-expectations/images/WhatsApp Image 2026-04-06 at 11.52.19.jpeg`

4. Super Admin / Sistem Raporlari
- `doc/customer-expectations/images/WhatsApp Image 2026-04-06 at 11.52.27.jpeg`

5. Super Admin / Guvenlik ve Log Merkezi
- `doc/customer-expectations/images/WhatsApp Image 2026-04-06 at 11.52.35.jpeg`

6. Tenant / Holding Gorunumu / Genel Durum
- `doc/customer-expectations/images/WhatsApp Image 2026-04-06 at 11.53.03.jpeg`

7. Tenant / Bina ve Site Portfoyu
- `doc/customer-expectations/images/WhatsApp Image 2026-04-06 at 11.53.10.jpeg`
- `doc/customer-expectations/images/WhatsApp Image 2026-04-06 at 11.53.23.jpeg`
- `doc/customer-expectations/images/WhatsApp Image 2026-04-06 at 11.54.17.jpeg`

8. Tenant / Daireler ve Bagimsiz Bolumler
- `doc/customer-expectations/images/WhatsApp Image 2026-04-06 at 11.53.31.jpeg`

9. Tenant / Daire Yonetimi Modal'i
- `doc/customer-expectations/images/WhatsApp Image 2026-04-06 at 11.53.38.jpeg`

10. Tenant / SMS Merkezi
- `doc/customer-expectations/images/WhatsApp Image 2026-04-06 at 11.54.38.jpeg`
