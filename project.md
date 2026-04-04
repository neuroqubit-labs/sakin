APARTMAN / SİTE YÖNETİMİ DİJİTAL ALTYAPI SİSTEMİ

Ürün Tanımı ve Kapsam Dokümanı (v1.0)

1. Ürün Tanımı

Bu ürün, apartman ve site yönetim süreçlerini uçtan uca dijitalleştirmek amacıyla geliştirilmiş, yönetim şirketlerinin operasyonlarını merkezi ve sürdürülebilir bir sistem üzerinden yürütmesini sağlayan bir yazılım altyapısıdır.

Sistem;

finansal süreçleri (aidat, tahsilat, borç takibi),
operasyonel süreçleri (arıza, görev yönetimi),
kullanıcı etkileşimini (mobil uygulama üzerinden sakin iletişimi)

tek bir platformda birleştirir.

Bu çözüm, klasik Excel/WhatsApp tabanlı yönetim modelini ortadan kaldırarak, şeffaf, ölçülebilir ve ölçeklenebilir bir yönetim sistemi oluşturmayı hedefler.

2. Ürün Bileşenleri

Sistem 3 ana bileşenden oluşur:

2.1 Yönetim Paneli (Admin Panel)

Yönetim şirketinin tüm operasyonlarını yürüttüğü merkezi kontrol panelidir.

2.2 Sakin Mobil Uygulaması

Apartman sakinlerinin borçlarını görüntüleyebildiği ve ödeme yapabildiği kullanıcı arayüzüdür.

2.3 Backend Servisi

Tüm veri akışını, iş kurallarını ve entegrasyonları yöneten sunucu katmanıdır.

3. Fonksiyonel Kapsam
   3.1 Temel Varlık Yönetimi

Sistem aşağıdaki yapıyı destekleyecek şekilde kurgulanacaktır:

Site / Apartman yönetimi
Blok / bina yapısı (opsiyonel)
Daire (bağımsız bölüm)
Sakin (ev sahibi / kiracı ayrımı)
Rol yönetimi

Bu yapı sayesinde her birim bağımsız olarak yönetilebilir ve raporlanabilir olacaktır.

3.2 Aidat ve Borç Yönetimi (Core Finans Modülü)

Sistemin en kritik bileşeni olup aşağıdaki işlevleri kapsar:

Aylık aidat tanımlama
Otomatik borç oluşturma
Daire bazlı borç takibi
Gecikme ve tahsilat durumu izleme
Manuel düzeltme işlemleri (admin tarafından)

Amaç:

Tüm finansal sürecin sistematik ve hatasız yürütülmesi

3.3 Ödeme Sistemi Entegrasyonu

Kullanıcıların mobil uygulama üzerinden ödeme yapabilmesini sağlar.

Kapsam:

Online ödeme entegrasyonu (ör. iyzico)
Ödeme sonrası otomatik borç düşümü
Manuel ödeme girişi (nakit / EFT için)
Ödeme geçmişi
3.4 Talep / Arıza Yönetimi (Ticket Sistemi)

Sakinlerin yaşadığı sorunları yönetim şirketine iletebilmesini sağlar.

Kapsam:

Talep oluşturma
Kategori seçimi (elektrik, temizlik vb.)
Durum takibi (açık / işlemde / tamamlandı)
Yönetim tarafından atama ve yönetim

Amaç:

WhatsApp tabanlı dağınık iletişimi ortadan kaldırmak

3.5 Bildirim ve Duyuru Sistemi
Yönetim → sakin iletişimi
Toplu duyurular
Ödeme hatırlatmaları
Push notification altyapısı
3.6 Raporlama (Temel Seviye)
Toplanan aidat
Kalan borç
Tahsilat oranı
Daire bazlı durum 4. Mobil Uygulama Kapsamı

Mobil uygulama sade ve işlev odaklı olacaktır.

Kullanıcı tarafında:
Güncel borç görüntüleme
Online ödeme yapma
Talep oluşturma
Duyuruları görüntüleme

⚠️ Bilinçli tercih:

Mobil uygulama “engagement ürünü” değil, işlevsel araç olarak konumlandırılmıştır.

5. Kullanılacak Hazır Teknolojiler (Build vs Buy Stratejisi)

Sistem tamamen sıfırdan geliştirilmeyecek, kritik olmayan bileşenlerde hazır servisler kullanılacaktır.

Entegre edilecek servisler:
Ödeme altyapısı → iyzico
Bildirim → Firebase
Kimlik doğrulama → Firebase Authentication veya eşdeğer
Neden?
Geliştirme süresini kısaltmak
Güvenilirlik sağlamak
Kritik olmayan alanlarda kaynak harcamamak 6. Kapsam DIŞI (Bilinçli Olarak Yapılmayacaklar)

Bu ürün ilk fazda aşağıdaki alanları kapsamaz:

Tam kapsamlı muhasebe yazılımı (ERP seviyesi)
Karmaşık finansal entegrasyonlar (e-fatura, e-defter vb.)
Gelişmiş analitik ve BI sistemleri
Yapay zeka tabanlı öneri sistemleri
Çoklu dil / uluslararası kullanım
Gelişmiş oylama / genel kurul sistemleri

Bu özellikler ilerleyen fazlarda değerlendirilecektir.

7. Dağıtım Modeli (Deployment Stratejisi)
   İlk faz:
   Belirli yönetim şirketine özel kurulum (custom deployment)
   Teknik yaklaşım:
   Altyapı çoklu müşteri (multi-tenant) destekleyecek şekilde geliştirilecektir
   Amaç:

Kısa vadede hızlı adaptasyon
Uzun vadede SaaS ürünleşme

8. Sistem Yaklaşımı ve Tasarım Prensipleri
1. Basitlik

Sistem, Excel kullanan bir operatörün kolayca adapte olabileceği şekilde tasarlanacaktır.

2. Şeffaflık

Tüm finansal hareketler kayıt altına alınacak ve geriye dönük izlenebilir olacaktır.

3. Güvenilirlik

Ödeme ve borç sistemi hataya kapalı şekilde kurgulanacaktır.

4. Operasyon Odaklılık

Sistem, teorik değil günlük iş akışlarına göre tasarlanacaktır.

9. Başarı Kriterleri (KPIs)

Projenin başarısı aşağıdaki metriklerle ölçülecektir:

Tahsilat oranı (% artış)
Operasyon süresi (arıza çözüm süresi)
Manuel iş yükü azalması
Kullanıcı (sakin) ödeme oranı 10. Yol Haritası (Özet)
Faz 1 (Çekirdek Sistem)
Aidat & borç sistemi
Ödeme entegrasyonu
Admin panel
Basit mobil uygulama
Faz 2
Talep yönetimi
Bildirim sistemi
Faz 3
Gelişmiş raporlama
operasyon optimizasyonu
SONUÇ

Bu ürün;

apartman ve site yönetim şirketleri için
operasyonel, finansal ve kullanıcı etkileşimini birleştiren merkezi bir yönetim sistemi olarak konumlandırılmıştır.

Amaç:

operasyonu sadeleştirmek
tahsilatı artırmak
yönetimi ölçeklenebilir hale getirmek
