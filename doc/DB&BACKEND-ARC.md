Veritabanı ve Genel Altyapı Kurgusu
1. Sistem tanımı

Bu ürün, bina yönetim firmalarına satılan çok kiracılı bir SaaS platformudur. Sistemin görevi; bina, daire, kullanıcı, aidat, tahsilat ve temel operasyon süreçlerini tek bir yapıda toplamak, ödeme hareketlerini güvenli biçimde kaydetmek ve bu kayıtları raporlanabilir, sorgulanabilir ve muhasebeye aktarılabilir hale getirmektir.

Bu sistem bir muhasebe programı değildir. Bu sistem bir tahsilat ve finansal takip altyapısıdır. Resmi muhasebe, vergi ve faturalama süreçleri dış sistemlerde yürütülür. Bu ürün o sistemlerin besleneceği temiz operasyonel veriyi üretir.

Bu nedenle veritabanı kurgusu şu üç şeyi aynı anda çözmelidir: çok kiracılı izolasyon, fiziksel yapı ile kullanıcı ilişkilerinin doğru tutulması, finansal hareketlerin zaman içinde bozulmadan izlenebilmesi.

2. Temel modelleme yaklaşımı

Bu sistem bir CRUD uygulaması gibi modellenmemelidir. Çünkü burada yalnızca “şu an kim borçlu” bilgisi tutulmaz. Aynı zamanda “hangi dönemde hangi daireye hangi borç üretildi, o sırada daireyle ilişkili kişi kimdi, ödemeyi kim yaptı, ödeme hangi kanal üzerinden geçti, kim onayladı, hangi şirkete aitti” sorularına da cevap verilmelidir.

Bu nedenle modelleme iki eksen üzerinde kurulmalıdır. Birinci eksen yapısal eksendir: şirket, site, blok, daire, kullanıcı. İkinci eksen zamansal eksendir: oturum süresi, sorumluluk değişimi, tahakkuk dönemi, ödeme zamanı, onay zamanı, kullanıcı değişimi. Bu iki eksen birlikte düşünülmezse sistem ilk kullanıcı değişiminde veya ilk finansal itirazda kırılır.

3. Ana alanlar

Sistem dört çekirdek alan etrafında kurulmalıdır.

Birinci alan organizasyondur. Burada tenant, tenant çalışanları, tenant ayarları, erişim yetkileri ve platform seviyesi kontrol bulunur.

İkinci alan fiziksel yapıdır. Burada site, blok, daire, bağımsız bölüm ve bunların hiyerarşisi bulunur.

Üçüncü alan kişilerdir. Burada sistem kullanıcıları, son kullanıcılar, yönetici firma çalışanları ve daire ile ilişkili kişiler bulunur.

Dördüncü alan finansal harekettir. Burada aidat, tahsilat, hareket defteri ve dış ödeme olayları bulunur.

Bu dört alan birbirine bağlıdır ama birbirinin yerine geçmez. En sık yapılan hata kişi ile daireyi, ödeme ile borcu veya muhasebe ile operasyonel kaydı birbirine karıştırmaktır.

4. Çok kiracılı yapı

Bu platform baştan çok kiracılı düşünülmelidir. Her bina yönetim firması bir tenant’tır. Tenant, sistem içindeki bütün temel verilerin üst bağlamıdır. Tenant’a ait olan her kayıtta tenantId bulunmalıdır. Bu, yalnızca iyi bir alışkanlık değil, sistemin temel güvenlik kuralıdır.

Bir tenant’ın çalışanı yalnızca kendi tenant verisini görebilmelidir. Son kullanıcı da yalnızca kendi ilişkilendirildiği daireleri görebilmelidir. Platform sahibi için ayrı bir super admin erişimi bulunur; bu erişim tenant sınırını aşabilir.

Tenant izolasyonu veritabanı tasarımında açık biçimde görülmelidir. Tenant’tan bağımsız, ortak ve küresel kalabilecek tablolar yalnızca sistem seviyesindeki lookup veya platform konfigürasyon tabloları olabilir. Bunların dışındaki tüm iş verileri tenant bağlamında tutulmalıdır.

5. Finansal merkezin kullanıcı değil daire olması

Bu sistemde finansal varlık kullanıcı değildir. Finansal varlık dairedir. Borç, daireye yazılır. Ödeme, daire borcuna karşılık işlenir. Kullanıcı değişebilir, kiracı değişebilir, sorumlu kişi değişebilir; ama dairenin finansal geçmişi korunur.

Bu nedenle veritabanı kurgusu Unit merkezli düşünülmelidir. Unit, finansal sabit noktadır. Kişiler bu Unit ile ilişkilendirilir. Bu ilişki zaman içinde değişebilir. Ancak borç geçmişi ve ödeme hareketleri Unit üzerinde izlenir.

Bu karar kritiktir. Eğer finans kullanıcıya yazılırsa, kiracı değişiminde geçmiş bozulur. Eğer finans daireye yazılırsa, hem geçmiş korunur hem de kim ödedi, kim sorumluydu, hangi dönemde kim oturuyordu gibi sorular sonradan cevaplanabilir.

6. Kullanıcı modeli

Sistemde tek tip kullanıcı yerine rol tabanlı birleşik bir kullanıcı modeli tercih edilmelidir. Aynı user tablosu; platform yöneticisini, tenant çalışanını ve resident tipindeki son kullanıcıyı taşıyabilir. Rol bilgisi ilişki katmanında çözülmelidir.

Kullanıcı kimliğinde telefon numarası birincil erişim anahtarı olarak düşünülmelidir. Son kullanıcı login akışında telefon doğrulaması temel yöntemdir. TCKN gibi alanlar kimlik eşleşmesi ve kayıt doğrulaması için tutulabilir; ancak authentication anahtarı olarak değil, identity verification alanı olarak düşünülmelidir.

Son kullanıcı kendi başına sisteme kayıt açmamalıdır. Kullanıcı önce tenant çalışanı tarafından sisteme eklenmeli, sonra telefon doğrulaması ile hesabı aktive edilmelidir. Bu sayede kullanıcı yalnızca gerçekten sisteme tanımlı olduğu dairelere erişebilir.

7. Daire-kullanıcı ilişkisi

Daire ile kullanıcı arasında doğrudan ve tek satırlık bir bağ kurmak yanlış olur. Bunun yerine ayrı bir ilişki tablosu kullanılmalıdır. Bu ilişki tablosu, bir kullanıcının hangi daire ile hangi sıfatla ilişkili olduğunu tutmalıdır. Owner, tenant, responsible, contact gibi roller desteklenmelidir.

Bu ilişkide bir de “primary responsible” mantığı bulunmalıdır. Bir daireyle ilişkili birden fazla kişi olabilir; ancak ödemelerden sorumlu birincil kişi tek olmalıdır. Böylece gerçek hayatla uyum korunur. Eşler, malikler, kiracılar, vekiller sistemde ayrı ayrı tutulabilir ama tahsilat ve bildirim mantığı primary sorumlu üzerinden ilerleyebilir.

Bu ilişki zaman boyutuna sahip olmalıdır. Başlangıç tarihi ve bitiş tarihi tutulmalıdır. Böylece aynı daire için geçmişte kim oturuyordu, kim sorumluydu, ne zaman değişti soruları cevaplanabilir.

8. Fiziksel yapı modeli

Fiziksel dünya hiyerarşik biçimde modellenmelidir. Tenant altında Site yer alır. Site altında Block bulunabilir. Block altında Unit bulunur. Block opsiyonel olmalıdır çünkü her müşteri bloklu bir yapıda çalışmayabilir. Ancak model bloksuz ve bloklu yapıları aynı anda desteklemelidir.

Unit, sistemin en kritik fiziksel varlığıdır. Çünkü hem kişisel ilişki hem finans hem de dönemsel tahakkuk burada birleşir. Bu nedenle Unit tablosu sade ama güçlü olmalıdır. Site, block, bağımsız bölüm numarası, tip, durum ve tenant ilişkisi net tutulmalıdır. Unique constraint’ler gerçek dünyayı bozmayacak biçimde düşünülmelidir. Örneğin aynı site içinde aynı blok ve aynı numarada iki daire olmamalıdır.

9. Finansal model

Finansal model üç katmanda kurulmalıdır. Birinci katman tahakkuktur. İkinci katman ödeme kaydıdır. Üçüncü katman hareket defteridir.

Tahakkuk, borç yaratma niyetidir. Örneğin Nisan 2026 aidatı. Bu kayıt daireye bağlıdır ve dönem bazlıdır. Aynı daire ve aynı dönem için duplicate tahakkuk üretilememelidir.

Ödeme kaydı, tahsilat olayının kendisidir. Hangi daire için, hangi tutarda, hangi yöntemle, kim tarafından, hangi kanaldan, hangi durumda gerçekleştiğini tutar. Ödeme kaydı, online, banka transferi, nakit veya POS olabilir.

Hareket defteri, finansal gerçekliğin kendisidir. Borç veya ödeme sisteme yalnızca append-only ledger mantığıyla yazılmalıdır. Hiçbir finansal kayıt update edilmemeli, delete edilmemelidir. Düzeltme gerekiyorsa yeni bir hareket yazılmalıdır. Bakiye kolonları tutulmamalı, bakiye ledger toplamından türetilmelidir.

Bu model, kısmi ödeme, iade, manuel düzeltme, affedilen borç, dönemsel tahakkuk, gecikmeli onay gibi tüm gerçek senaryoları temiz biçimde taşır.

10. Tahakkuk tasarımı

Aidat ve tahakkuk sistemi dönemsel düşünülmelidir. Dues veya benzeri tahakkuk tablosu daire, dönem, tutar, tür ve durum bilgisi içermelidir. Aynı daire için aynı ay ve yıl kombinasyonunda ikinci kez aidat oluşmamalıdır. Bu idempotency kuralı veritabanı seviyesinde unique constraint ile korunmalıdır.

Tahakkuk tablosu tek başına bakiye kaynağı değildir. Tahakkuk oluştuğunda ledger’a borç hareketi de yazılmalıdır. Bu sayede herhangi bir anda mevcut finansal durum yalnızca movement sum üzerinden görülebilir.

11. Ödeme tasarımı

Ödeme tablosu finansal tahsilat kayıtlarını tutar. Burada ödeme tipi, ödeme kanalı, ödeme durumu, ödeme sağlayıcısı, external reference, onaylayan kullanıcı ve zaman alanları yer almalıdır.

Kim ödeme yaptı sorusu ile borç kimin dairesine ait sorusu ayrılmalıdır. Bu nedenle payment içinde unitId zorunlu olmalıdır; ödeme yapan kişi için paidByUserId ayrı alan olarak tutulmalıdır. Bazı durumlarda ödeme yapan kayıtlı kullanıcı olmayabilir; böyle senaryolarda free-text payerInfo veya fallback kimlik alanı düşünülebilir. Ama sistem içi ödemelerde paidByUserId ana model olmalıdır.

Ödeme durumu tasarımı nettir. PENDING, CONFIRMED, FAILED, CANCELLED, REFUNDED gibi durumlar sistemde bulunmalıdır. Online ödemede confirmed sistem tarafından gelir. Banka transferi fallback senaryosunda confirmed tenant çalışanı onayıyla gelir. Nakitte ödeme girdisi zaten confirmed oluşabilir. Bu fark sistem içinde açık şekilde izlenmelidir.

12. Ledger tasarımı

Ledger bu sistemin güvenlik duvarıdır. Burada miktar signed decimal tutulmalıdır. Borç pozitif, ödeme negatif olabilir ya da tersi seçilebilir; ama konvansiyon ürün boyunca tek olmalıdır.

Ledger kaydı şu bilgileri taşımalıdır: tenant, unit, amount, currency, entry type, reference type, reference id, createdBy, effectiveAt, note. Entry type örnekleri charge, payment, adjustment, waiver, refund olabilir. Reference type ile bu hareketin dues, payment veya manuel adjustment hangi kayda bağlı olduğu görülebilmelidir.

Veritabanı tasarımının ana ilkesi şudur: sistemde finansal gerçeklik ledger’dır. Dues ve Payment, ledger’a hareket yazan iş olaylarıdır.

13. Ödeme sağlayıcı olayları

Online ödeme altyapısında payment kaydı tek başına yeterli değildir. Dış sağlayıcı ile konuşulan dünyayı ayrıca tutmak gerekir. Bu nedenle payment attempt ve provider event tabloları önerilir.

PaymentAttempt, checkout başlatma anındaki iç kaydı tutar. Hangi kullanıcı, hangi daire, hangi tutar, hangi provider, hangi internal reference ile ödeme başlattı bilgisi burada tutulur. Provider event tablosu ise webhook ve callback gibi dış olayların ham kaydını tutar. Bu tablo debug, idempotency ve hata analizi için kritiktir.

Bu yapı sayesinde aynı webhook iki kez gelse bile sistem hangi event’in işlendiğini bilir. Ayrıca ödeme sağlayıcı referanslarının unique olarak korunması kolaylaşır.

14. Audit ve izlenebilirlik

Bu ürün yönetim, tahsilat ve kullanıcı erişimi taşıdığı için audit log zorunludur. Kim hangi daireyi görüntüledi, kim hangi ödemeyi onayladı, kim hangi tahakkuku oluşturdu, kim hangi kullanıcıyı sisteme ekledi sorularının yanıtı bulunmalıdır.

Audit log iş verisinin yerine geçmez. Ayrı bir denetim tablosu olarak tutulmalıdır. Özellikle manuel banka transferi onayları, nakit girişleri, kullanıcı eşleştirmeleri ve tenant ayar değişiklikleri burada izlenmelidir.

15. Export ve muhasebe entegrasyonu

Sistemin resmi muhasebe yapmadığı baştan kabul edildiği için export modeli ana strateji olmalıdır. Export yapısı doğrudan payment ve ledger üzerinden beslenmelidir. Kullanıcı tarih, site, blok, daire, ödeme tipi, durum, açıklama gibi filtrelerle tahsilat export’u alabilmelidir.

Bu export muhasebe programına uygun kolonları vermelidir ama muhasebe planı üretmemelidir. Yani sistem, “işte bütün tahsilatlar” diyebilmelidir; “işte resmi muhasebe fişin” dememelidir.

Export batch’lerinin de sistemde tutulması faydalıdır. Kim hangi tarihte hangi veriyi dışarı aldı, hangi filtrelerle export yaptı, bu daha sonra denetim için önemlidir.

16. Genel altyapı yaklaşımı

Bu ürün için önerilen altyapı modüler monolith’tir. Veritabanı olarak PostgreSQL kullanılmalıdır. Çünkü ilişkisel model, transaction desteği, unique/index yetenekleri ve finansal tutarlılık bu ürün için zorunludur.

İş kuralları uygulama katmanında modüllere ayrılmalıdır. Auth, tenant, property, resident, dues, payment, ledger, export, audit, notification gibi modüller aynı backend içinde açık sınırlarla bulunmalıdır. Bu yaklaşım, hem hızlı geliştirme sağlar hem de şema etrafında bir domain disiplini kurar.

Queue veya background job altyapısı özellikle tahakkuk üretimi, export üretimi, bildirim gönderimi, webhook işleme ve dönemsel görevler için eklenmelidir. Ancak bu, veritabanı modelinin yerine geçmez. Önce doğru şema, sonra asenkron işleyiş gelir.

17. Kimlik doğrulama ve erişim

Çalışan tarafında tenant çalışanları kendi kullanıcıları ve şifreleri ile sisteme giriş yapabilir. MFA ihtiyaca göre sonradan eklenebilir. Son kullanıcı tarafında telefon doğrulaması temel yöntemdir.

Kritik nokta şudur: authentication ve authorization ayrılmalıdır. Telefon ile giriş yapmış olmak, otomatik olarak bir daireyi görme hakkı vermez. Daire görme hakkı, user-unit relation tablosundan gelir. Bu ayrım çok önemlidir. Aksi halde sistem güvenli gibi görünür ama verisel olarak açık verir.

18. Performans ve indeksleme mantığı

Bu tip sistemlerde en çok sorgulanan alanlar tenant, unit, dönem, status ve createdAt etrafında döner. Bu nedenle tenantId her tabloda index’lenmelidir. Payment, ledger, dues ve occupancy tablolarında composite index’ler düşünülmelidir.

Ancak performans için baştan denormalize edilmiş balance kolonları veya derived summary tabloları üretmek önerilmez. Önce doğru normalize model kurulur. Gerçek kullanım yükü görüldükten sonra materialized view, summary table veya cache stratejisi eklenebilir.

19. Sürdürülebilirlik ilkeleri

Bu şemayı ileriye dönük sürdürülebilir yapan şey, bugünkü ekranlara göre değil domain gerçeklerine göre kurulmasıdır. Tenant sabit katmandır. Unit finansal merkezdir. User ile unit ilişkisi ayrı tutulur. Dönemsel tahakkuk bağımsızdır. Payment tahsilat olayıdır. Ledger finansal gerçektir. Audit ayrıca tutulur. Export muhasebe köprüsüdür.

Bu kurgu kurulduğunda yeni ekranlar eklenebilir, yeni ödeme yöntemleri eklenebilir, yeni raporlar türetilebilir, mobil uygulama sonradan geliştirilebilir. Ama bu kurgu kurulmazsa her yeni talep mevcut yapıyı zorlar.

20. Kaçınılması gereken hatalar

User tablosunu doğrudan daireye gömmek hatadır. Balance kolonunu temel veri gibi kullanmak hatadır. Borcu kullanıcıya yazmak hatadır. Tahsilat ile muhasebeyi aynı kavram sanmak hatadır. Tenant bilgisini ilişkisiz tutmak hatadır. Geçmiş ilişkiyi overwrite etmek hatadır. Online ödeme sonucu frontend’den başarı olarak kabul etmek hatadır. Manual onay gerektiren işlemlerde kim onayladı bilgisini tutmamak hatadır.

21. Net öneri

Bu ürünün veritabanı ve altyapı omurgası şu cümle ile özetlenir: Çok kiracılı bir yapıda, daireyi finansal merkez kabul eden, kullanıcı-daire ilişkisini zaman boyutuyla tutan, tahakkuk ve tahsilatı ledger üzerinden birleştiren, ödeme sağlayıcı olaylarını ayrı izleyen, resmi muhasebe değil ama muhasebeye aktarılabilir temiz operasyonel finans verisi üreten ilişkisel bir sistem.

Dipnot olarak iki konu açık bırakılabilir. Birincisi, resident kullanıcı için TCKN zorunluluğu müşteri segmentine göre esnetilebilir; ancak telefon doğrulaması zorunlu kalmalıdır. İkincisi, bazı büyük müşterilerde blok, bağımsız bölüm tipi veya çoklu sorumlu kişi yapısı daha karmaşık olabilir; bu nedenle ilişki tablosu rol bazlı ve genişletilebilir kurulmalıdır.