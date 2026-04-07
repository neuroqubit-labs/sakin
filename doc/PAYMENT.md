Ürün tanımı

Bu ürün, bina yönetim firmalarının bina, daire, sakin, aidat, tahsilat ve temel operasyon süreçlerini tek sistemde yönetmesini sağlayan çok kiracılı bir SaaS platformudur. Ürünün çekirdeği finansal takip ve tahsilattır. Mobil uygulama ve son kullanıcı yüzeyi bu çekirdeğin etrafında konumlanır; ürünün merkezi değildir.

Sistem üç katmandan oluşur. Üst katmanda platform sahibi vardır. Bu katman müşteri firmaları, planları, erişimleri, logları ve sistem ayarlarını yönetir. Orta katmanda müşteri bina yönetim firması vardır. Bu katman bina, daire, sakin, aidat, tahsilat ve temel raporlamayı kullanır. Alt katmanda son kullanıcı vardır. Son kullanıcı borcunu görür, ödeme yapar, gerekirse ödeme bildirimi bırakır.

Ürünün temel sınırı

Bu sistem muhasebe programı değildir. Fatura, vergi, resmi muhasebe fişi, hesap planı ve e-defter tarafı bu ürünün kapsamı değildir. Bu ürünün görevi tahsilatı başlatmak, ödeme kayıtlarını güvenli biçimde doğrulamak, borç hareketlerini izlemek ve muhasebe sistemine aktarılabilir temiz veri üretmektir. Muhasebe yazılımları bu veriyi import eder veya daha sonra entegrasyonla alır. Bu ayrım korunmalıdır.

Önerilen ödeme omurgası

Ödeme altyapısı iyzico üzerine kurulmalıdır. Bunun nedeni, tek bir entegrasyonla kart ödemesi, webhook tabanlı sonuç takibi, imza doğrulama ve güvenli banka transferi/EFT akışını aynı çatıda sunmasıdır. iyzico’nun Create Payment API’si kart ödemelerini başlatır; webhook mekanizması ödeme sonucunu sunucudan sunucuya iletir; webhook imza doğrulaması HMAC SHA256 ile yapılır; Secure Bank Transfer/EFT seçeneği etkinleştirildiğinde banka transferi eşleme süreci iyzico tarafından yürütülür ve sonuç API/webhook üzerinden sisteme düşer. Ayrıca ihtiyaç halinde pazaryeri/alt üye modeli de desteklenmektedir.

Ödeme modeli önerisi

Başlangıçta önerilen model, paranın doğrudan müşteri bina yönetim firmasının hesabına akmasıdır. Platform parayı üzerinde toplamaz. Platform ödeme orkestrasyonu, kayıt, raporlama ve kullanıcı deneyimini yönetir. Bunun ana nedeni operasyonel sadelik, tahsilat mutabakatının kolay olması ve gereksiz finansal aracılık yüküne girmemektir. Pazaryeri/alt üye modeli teknik olarak iyzico’da mümkündür; ancak bu model ikinci faz için saklanmalıdır. İlk fazda her tenant kendi merchant hesabı ile çalışmalı, platform tenant bazlı gateway credential yönetmelidir. Bu öneri, iyzico’nun hem standart ödeme akışını hem de pazaryeri alt üye işyeri modelini desteklemesine dayanır.

Ödeme kanalları

Sistem üç ödeme kanalını tek bir finansal modele bağlamalıdır.

Birinci kanal online kart ödemesidir. Son kullanıcı web veya mobil yüzeyde ödeme başlatır. Sistem iyzico ödeme oturumu oluşturur. Başarılı sonuç callback/webhook ile alınır. Ödeme doğrulanır, payment kaydı confirmed olur, ledger’a ödeme hareketi işlenir, daire bakiyesi güncellenmiş şekilde görünür. iyzico tarafında işlem sonucu anlık döner; webhook ise farklı mekanizmaları tetiklemek ve güvenli sunucu teyidi için kullanılabilir. Webhook başarısız teslimlerde tekrarlanır ve V3 imza doğrulaması beklenir.

İkinci kanal güvenli banka transferi/EFT’dir. Burada iki seçenek vardır. Birinci ve önerilen seçenek, iyzico’nun Secure Bank Transfer/EFT ürününü kullanmaktır. Bu modelde kullanıcı checkout akışında banka transferini seçer; iyzico transfer eşleşmesini kontrol eder, kullanıcıya ve merchant’a bildirim yollar, transaction durumunu günceller ve sonucu webhook/API ile iletir. Bu, manuel IBAN onay kuyruğunu ciddi biçimde azaltır. iyzico dokümantasyonuna göre banka hesap kontrolü ve matching süreci iyzico tarafından yaklaşık 15 dakikalık aralıklarla yürütülür.

İkinci ve yalnızca fallback olarak tutulması gereken seçenek, manuel IBAN bildirimidir. Kullanıcı ödeme yaptığını sisteme bildirir; sistem payment kaydını BANK_TRANSFER/PENDING olarak açar; çalışan banka hareketini kontrol eder; eşleşirse onaylar ve payment confirmed olur; ledger’a ödeme hareketi işlenir. Bu akış sistemde bulunabilir ama önerilen ana yol olmamalıdır.

Üçüncü kanal şube içi nakit veya fiziksel POS tahsilatıdır. Burada çalışan daireyi açar, borcu görür, ödeme al akışına girer, yöntemi CASH veya POS olarak seçer ve tahsilatı sisteme kaydeder. Eğer fiziksel POS cihazı sistemle entegre değilse bu kayıt operatör onaylıdır. Eğer ileride sanal POS benzeri masaüstü POS akışı kurulursa aynı payment modeli içinde yönetilir. Fakat MVP’de fiziksel POS entegrasyonu zorunlu değildir.

Finansal veri modeli

Finansal çekirdek iki ana yapıdan oluşmalıdır: Payment ve LedgerEntry. Payment, tahsilat olayının kendisidir. LedgerEntry ise finansal defter hareketidir. Dues, yani aidat/tahakkuk, borç yaratma niyetidir; gerçek bakiye ledger toplamından türetilir.

Zorunlu ana tablolar şunlardır: Tenant, Plan, TenantPaymentGatewayConfig, User, UserTenantRole, Site, Block, Unit, Resident, UnitOccupancy, DuesDefinition, Dues, Payment, PaymentAttempt, PaymentProviderEvent, LedgerEntry, ExportBatch, Notification, AuditLog.

Tenant sistemi kullanan bina yönetim firmasıdır. Site ve Block fiziksel portföyü tutar. Unit finansal varlıktır; borç daireye aittir. Resident kişidir; owner veya tenant olabilir. UnitOccupancy ile daire-kullanıcı ilişkisi zaman bazlı tutulur. Bu sayede kullanıcı değişse bile borç daire geçmişinde kalır.

Dues her dönem için daire bazında oluşan tahakkuktur. unitId + periodMonth + periodYear benzersiz olmalıdır. Payment her tahsilat kaydıdır ve type olarak ONLINE_CARD, BANK_TRANSFER, CASH, POS; status olarak PENDING, CONFIRMED, FAILED, CANCELLED, REFUNDED; channel olarak RESIDENT_WEB, RESIDENT_MOBILE, STAFF_PANEL; provider olarak IYZICO veya MANUAL; providerPaymentId, conversationId, token gibi alanlar taşımalıdır.

LedgerEntry immutable olmalıdır. amount signed decimal tutulmalı; CHARGE, PAYMENT, ADJUSTMENT, WAIVER, REFUND gibi hareket tipleri desteklenmelidir. Sistem asla balance kolonu yazmamalı; unit balance her zaman ledger toplamından türetilmelidir. Bu model, ödeme, iade, kısmi tahsilat ve düzeltme akışlarını sağlam yürütür.

Tenant izolasyonu

Sistem çok kiracılı olacaktır. Tüm tenant-aidiyetli tablolarda tenantId zorunludur. Tüm sorgular tenant scope ile çalışır. Platform tarafında yalnızca super admin global erişime sahiptir. Tenant admin ve staff yalnızca kendi tenant verisini görür. Tenant izolasyonu uygulama seviyesinde zorunludur; ileride ihtiyaç halinde veritabanı seviyesinde RLS gibi ek önlemler düşünülebilir. MVP için application-enforced tenancy yeterlidir. Bu bir dipnottur; kurum içi güvenlik gereksinimine göre sertleştirilebilir.

Yetki modeli

Roller dört ana seviyede kurgulanmalıdır. SUPER_ADMIN platform sahibidir. TENANT_ADMIN firma yöneticisidir. STAFF firma çalışanıdır. RESIDENT son kullanıcıdır. Resident, yalnızca ilişkilendirildiği ünite ve kendi ödeme geçmişiyle sınırlı erişime sahip olur. Tenant admin, tenant içi tüm siteleri ve finans ekranlarını görür. Staff rolü kısıtlı operasyon ve tahsilat yetkileriyle ayrılabilir.

Backend mimarisi

Önerilen backend yapısı modüler monolith’tir. Tek deploy edilen backend içinde açık sınırları olan domain modülleri bulunur. Başlangıçta microservice önerilmez.

Zorunlu modüller şunlardır:

Auth modülü. Login, token, refresh token, role resolution, tenant context.
Platform modülü. Tenant oluşturma, plan atama, gateway credential yönetimi, kullanım ve log izleme.
Property modülü. Site, block, unit, resident, occupancy yönetimi.
Dues modülü. Aidat tanımı, dönemsel tahakkuk, toplu borç üretimi.
Payment modülü. Checkout başlatma, ödeme bildirimleri, provider callback/webhook, manuel onay akışları, refund başlangıcı.
Ledger modülü. Finans hareketlerinin yazılması ve bakiye türetimi.
Export modülü. Tahsilat export’u, muhasebe import dosyaları, mutabakat export’ları.
Notification modülü. SMS, e-posta, push bildirimleri.
Audit modülü. Kim ne yaptı, ne zaman yaptı.
Reporting modülü. Tahsilat oranı, gecikmiş borç, dönemsel tahsilat ve aging görünümü.

Uygulama yüzeyleri

Yönetim firması için ana arayüz web admin paneldir. Bu panel asıl üründür. Super admin ve tenant admin aynı web uygulamasında rol bazlı görünümle çalışabilir. Son kullanıcı için resident web app zorunludur. Mobil uygulama resident web app’in wrapper’ı veya PWA tabanlı bir yüzeyi olarak ikinci aşamada ele alınabilir. Çünkü temel ihtiyaç ödeme ve borç görüntülemedir. Eğer native mobil istenirse, backend sözleşmeleri değişmeden eklenebilir.

Temel kullanıcı akışları

Tenant onboarding akışı şöyle olmalıdır. Super admin tenant oluşturur. Tenant planı atanır. Tenant’a iyzico merchant bilgileri veya ileride marketplace submerchant bilgileri tanımlanır. Tenant admin davet edilir. İlk site, block, unit ve resident verileri manuel girilir veya toplu import edilir.

Aidat akışı şöyle olmalıdır. Tenant admin veya staff, site bazlı aidat dönemini ve tutarını tanımlar. Sistem ilgili daireler için dues üretir. Her dues karşılığında ledger’a CHARGE hareketi yazılır. Duplicates engellenir.

Online kart ödeme akışı şöyle olmalıdır. Resident veya staff ödeme başlatır. Sistem iyzico checkout/payment initialize çağrısı yapar. conversationId ve internal paymentAttempt kaydı oluşturur. Ödeme sonucu callback ve webhook ile gelir. İmza doğrulanır. Gerekirse payment detail retrieve ile ikinci doğrulama yapılır. Payment CONFIRMED olur. Ledger’a PAYMENT hareketi yazılır. Kullanıcıya ve firmaya bildirim gider. iyzico dokümantasyonunda hem ödeme başlatma hem ödeme detayını sorgulama hem de webhook doğrulama mekanizmaları tanımlıdır.

Güvenli EFT akışı şöyle olmalıdır. Resident ödeme ekranında Secure Bank Transfer/EFT seçer. Ödeme girişimi iyzico üzerinden başlatılır. iyzico transferi eşleştirir. Sonuç webhook ile gelir. Sistem payment kaydını update eder. Tenant çalışanının manuel IBAN kontrolüne ihtiyaç minimuma iner.

Manuel IBAN fallback akışı şöyle olmalıdır. Resident IBAN’a transfer yapar ve ödeme bildirimi oluşturur. Payment PENDING durumunda açılır. Çalışan “bekleyen banka transferleri” ekranında satırı görür. Açıklama, tutar, tarih ve daire bilgisi ile banka ekstresini karşılaştırır. Onaylarsa payment confirmed olur ve ledger’a ödeme hareketi yazılır. Red ederse payment rejected/failed olur. Bu akış ürün içinde bulunmalıdır ama ana akış olarak değil, fallback olarak konumlandırılmalıdır.

Şube içi tahsilat akışı şöyle olmalıdır. Çalışan daireyi açar, mevcut borcu görür, ödeme al ekranından yöntemi CASH veya POS seçer, tutarı girer, tahsilatı kaydeder. Sistem confirmed payment üretir ve ledger’a ödeme hareketi yazar. Fiziksel POS ile gerçek entegrasyon yoksa bu operatör onaylıdır.

Muhasebe ve export kurgusu

Sistem muhasebe programı değildir. Sistemin sorumluluğu tüm tahsilatları tek finansal görünümde toplamak ve muhasebeye temiz export sağlamaktır. Export, tarih aralığı, ödeme tipi, site, blok, daire, tenant, durum ve açıklama alanlarını içermelidir. Minimum export kolonları tarih, belge/işlem referansı, daire, sakin, ödeme yöntemi, tutar, ödeme kanalı, açıklama ve durumdur. Muhasebe tarafı bu veriyi Logo, Mikro, Luca gibi yazılımlara import eder. İleride en çok kullanılan 1-2 programa özel mapping veya doğrudan entegrasyon eklenebilir. Ancak ilk sürümde doğru model export/import modelidir.

Güvenlik ilkeleri

Ödeme sonuçları yalnızca backend tarafından doğrulanmalıdır. Frontend hiçbir zaman başarı kaynağı olmamalıdır. Webhook imza doğrulaması zorunludur ve iyzico V3 signature kullanılmalıdır. Bunun yanında callback sonrası retrieve/payment detail çağrısı ile provider-side second check önerilir. Payment webhook’ları idempotent işlenmelidir. providerPaymentId veya iyzi reference alanları unique olmalıdır. Aynı ödeme iki kez ledger’a yazılamamalıdır. iyzico, webhook sonuçlarının 2xx dönülmezse tekrar gönderildiğini belirtmektedir; bu yüzden event store ve idempotency zorunludur.

Teknik platform önerisi

Backend için NestJS veya benzeri modüler bir Node.js framework uygundur. PostgreSQL ana veri tabanı olmalıdır. ORM olarak Prisma kullanılabilir. Redis, queue ve rate limit amacıyla eklenmelidir. Background jobs için BullMQ veya eşdeğeri kullanılmalıdır; özellikle webhook işleme, dönemsel aidat üretimi, bildirim ve export üretimi için. Dosya ve export saklama için S3 uyumlu obje depolama tercih edilmelidir.

Admin UI için Next.js veya eşdeğer web framework uygundur. Resident web için aynı tasarım sistemiyle ayrı bir application shell kullanılabilir. API sözleşmesi REST ile başlayabilir; iç raporlama ihtiyaçları artarsa query tarafında BFF veya GraphQL gerekirse sonradan değerlendirilebilir. MVP için REST yeterlidir.

Önerilen API sınırları

Platform API. Tenant create/update, plan, credential, logs.
Property API. Site, block, unit, resident, occupancy.
Dues API. Generate dues, list dues, waive/adjust.
Payment API. Create checkout session, create bank transfer intent, create cash payment, confirm manual bank transfer, provider webhook, refund start.
Ledger API. Unit statement, period statement, tenant collection summary.
Export API. Collections export, dues export, accounting export.
Notification API. SMS/email triggers and templates.

MVP kapsamı

İlk sürümde zorunlu olanlar şunlardır. Çok kiracılı yapı. Super admin paneli. Tenant admin paneli. Site/block/unit/resident yönetimi. Dönemsel aidat üretimi. Ledger tabanlı borç görünümü. iyzico kartlı ödeme entegrasyonu. iyzico webhook/signature doğrulaması. Secure Bank Transfer/EFT veya fallback manuel IBAN onay kuyruğu. Nakit/şube tahsilat kaydı. Export ekranı. Audit log.

İlk sürümde bilinçli olarak dışarıda tutulabilecek alanlar şunlardır. Gelişmiş gider ve kasa muhasebesi. Personel bordro ve SGK süreçleri. Hukuki icra otomasyonu. Gelişmiş dashboard BI. Native mobile first deneyim. Çoklu payment provider. Pazaryeri alt üye settlement.

İkinci faz notları

Eğer iş modeli platformun işlemden pay almasını gerektirecek kadar olgunlaşırsa, iyzico marketplace/alt üye modeli teknik olarak mevcuttur ve tenant’ların subMerchantKey ile yönetildiği bir settlement mimarisi kurulabilir. Bu durumda platform komisyon ve hak ediş akışları payment split üzerinden yönetilebilir. iyzico’nun alt üye oluşturma ve pazaryeri ödeme akışları bunu desteklemektedir. Ancak bu karar ürün-pazar uyumundan sonra verilmelidir.

Net öneri

Tartışmasız önerilen sistem şudur: Çok kiracılı tek platform, web admin merkezli kullanım, resident web ile son kullanıcı erişimi, finans çekirdeğinde immutable ledger, ödeme tarafında iyzico, kart ödemesinde tam otomasyon, banka transferinde mümkünse iyzico Secure EFT, değilse kontrollü onay kuyruğu, nakitte operatör kayıtlı tahsilat, muhasebeye export veren ama muhasebenin yerini almayan bir ürün.

Bu sistem sektör standardına uygundur çünkü tahsilatı merkezi olarak görünür kılar, ödeme kayıtlarını doğrulanabilir tutar, resmi muhasebe sorumluluğunu üzerine almaz, tenant bazlı satılabilir SaaS yapısını korur ve ödeme tarafında yerel PSP’nin sunduğu güvenli webhook, imza doğrulama, kart ve EFT akışlarını kullanır.

Dipnot 1: Eğer tenant başına ayrı merchant hesabı operasyonel olarak zor gelirse, geçici olarak tek merchant hesabı ile başlanabilir; ancak bu durumda tenant bazlı settlement ve mutabakat karmaşıklığı artar. Ürün mimarisi bunu desteklese de varsayılan öneri bu değildir.

Dipnot 2: Secure Bank Transfer/EFT özelliğinin merchant hesabında aktive edilmesi gereklidir; aktive edilemiyorsa fallback manuel IBAN onayı ürün içinde bulunmalıdır.

Dipnot 3: Mobil uygulama resident adoption için faydalıdır ama çekirdek değer yaratmaz. Çekirdek değer web admin + tahsilat motorudur. Bu yüzden backend sözleşmeleri mobile bağımsız kurulmalıdır.

Dipnot 4: Eğer ileride büyük kurumsal müşteriler tek oturumda birden fazla tenant veya marka yönetmek isterse, user-tenant-role join modeli ve tenant switching baştan desteklenmelidir.
