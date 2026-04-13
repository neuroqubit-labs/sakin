# Sakin — Claude Bağlamı

## Biz Kimiz

Kayseri / Konya gibi iç Anadolu şehirlerinde bina yönetim hizmetleri veren bir şirketiz.
Bu yazılımı önce kendi operasyonumuzu yönetmek için kullanacağız — ilk müşteri biziz.
Ardından bölgedeki benzer şirketlere SaaS olarak sunacağız (~6 ay hedef).

**Neden bu yazılımı yazıyoruz?**
Çünkü sektör hâlâ Excel ve WhatsApp üzerinde yürüyor. Bunu bizzat yaşıyoruz.
Mevcut alternatiflerin ya çok pahalı, ya çok karmaşık, ya da bölgeye yabancı olduğunu görüyoruz.

---

## Hedef Kullanıcı: Yönetim Şirketi Personeli

Günlük işini şöyle düşün:

- Sabah ofise gelince Excel'i açıyor, hangi dairenin aidatı ödemediğini kontrol ediyor
- Telefon açıyor, hatırlatıyor, not alıyor — aynı döngü her ay
- Whatsapp'ta 10 farklı site grubundan bakım talepleri geliyor, hangisini takip etti hangisini etmedi belli değil
- Asansör şirketi faturası geldi, gider girişi için ayrı bir defter var
- Güvenlik görevlisinin izni çakıştı, vardiya planını elle yapıyor
- Ay sonu yönetim kuruluna rapor hazırlamak için saatler harcıyor

Bu kişi teknik değil. Sistemi beğenmesi için "Excel'den daha kolay" olması yeterli.
Özellik zenginliği değil, iş yükü azalması isteniyor.

## Hedef Kullanıcı: Sakin (Daire Sakini)

- Aidat borcunu öğrenmek için yöneticiyi aramak zorunda kalıyor
- Ödeme yapmak için bankaya gidip EFT yapıyor ya da ofise uğruyor
- Asansör bozuldu, kim arıyacak? WhatsApp'a yazıyor, kaybolup gidiyor
- Hangi ayların borcunu ödediğini hatırlamıyor

Bu kişinin beklentisi minimal: borcunu görsün, kolay ödesin, arıza bildirsin.
Mobil uygulama bir "engagement ürünü" değil — işlevsel bir araç.

---

## Ne İnşa Ediyoruz

Üç bileşen:

**1. Yönetim Paneli (Admin Panel)**
Yönetim şirketi personelinin her şeyi yönettiği merkez.
Aidat oluşturma, tahsilat takibi, gider girişi, personel yönetimi, duyuru gönderme.

**2. Sakin Mobil Uygulaması**
Sakinlerin elindeki araç.
Borç görüntüleme, online ödeme, arıza bildirimi, duyuru okuma.

**3. Backend API**
İki uygulamanın veri ve iş mantığını taşıyan servis katmanı.

---

## Temel Özellikler ve İş Mantığı

### Aidat & Borç Yönetimi (en kritik modül)
- Her ay site genelinde toplu aidat oluşturulur (örn. Nisan 2026, ₺500)
- Her daire için ayrı borç kaydı açılır — aynı ay ikinci kez oluşturulamaz (idempotent)
- Sakin ödeme yaptıkça `paidAmount` artar; tam ödeme → `PAID`, vadesi geçmiş → `OVERDUE`
- Yönetici geçmiş ay borçlarını görebilir: "Daire 1: Eylül 800₺ borçlu, Ekim temiz, Kasım 800₺ borçlu"
- Daire bazlı ekstre oluşturulup sakine gönderilebilir

### Online Ödeme (iyzico)
- Sakin mobil uygulamadan kredi/banka kartıyla öder
- Ödeme ertesi gün yönetim şirketi hesabına aktarılır (iyzico t+1)
- Manuel ödeme girişi de var: nakit veya EFT için admin girer

### Gelir & Gider Takibi
- Toplanan aidatlar otomatik gelir olarak kaydedilir
- Asansör bakım faturası, temizlik personel ücreti, elektrik faturası gibi giderler admin tarafından girilir
- Site bazında net durum görünür: bu ay ne toplandı, ne harcandı

### İletişim: WhatsApp & SMS
- Yönetici tüm sakinlere ya da belirli bir daireye toplu mesaj gönderebilir
- Borç hatırlatmaları otomatik tetiklenebilir
- Sakinlere erişim kanalı olarak WhatsApp/SMS entegrasyonu planlanıyor (Faz 2)

### Talep / Arıza Yönetimi (Faz 2)
- Sakin uygulamadan talep oluşturur: kategori (elektrik, temizlik, asansör vb.), açıklama
- Yönetici görür, ilgili personele atar, durum günceller (açık → işlemde → tamamlandı)
- Amacı: WhatsApp gruplarındaki dağınık iletişimi tek kanala toplamak

### Çalışan Takibi (Faz 2)
- Güvenlik, temizlik gibi personelin vardiya ve görev takibi
- Görev atama, raporlama

### Bildirim Sistemi (Faz 2)
- Push notification (Firebase FCM)
- Ödeme hatırlatmaları, duyurular, talep güncellemeleri

---

## Stratejik Bağlam

**Faz 1 — MVP, kendi şirketimizde**
Çalışır sistem. Aidat, ödeme, admin panel, temel mobil uygulama.
Bu fazda öğreniyoruz: hangi özellik gerçekten kullanılıyor, iş akışında ne sürtünme yaratıyor.

**Faz 2 — Genişleme**
Talep yönetimi, bildirimler, WhatsApp/SMS.
İlk harici müşteri denemeleri başlayabilir.

**Faz 3 — SaaS**
Çok müşterili altyapı zaten baştan var (multi-tenant).
Self-serve onboarding, abonelik yönetimi, ölçek.

**Kapsam dışı (bilinçli olarak):**
ERP muhasebe, e-fatura, BI, yapay zeka, genel kurul sistemi, uluslararasılaşma.
Bunları tartışmaya açmak bile zaman kaybı — odak korunmalı.

---

## Ürün Felsefesi

- **Basitlik önce**: Excel kullanan biri adaptasyon sürtünmesi yaşamamalı
- **Şeffaflık**: Her finansal hareket izlenebilir; yönetici de sakin de güvenmeli
- **Güvenilirlik**: Ödeme ve borç sistemi hata affetmez — para hassas alan
- **Operasyon odaklı**: Teorik değil, bu kişi bugün ne yapıyor, nasıl kolaylaşıyor
- **MVP'yi çalıştır, sonra büyüt**: Çalışmayan bir özellik zenginliği yerine çalışan bir çekirdek

---

## Kullanıcı Rolleri

| Rol | Kim | Ne yapar |
|-----|-----|---------|
| `SUPER_ADMIN` | Biz (sistem sahibi) | Tenant yönetimi, SaaS operasyonu |
| `TENANT_ADMIN` | Yönetim şirketi yöneticisi | Tüm operasyon: aidat, ödeme, personel, raporlama |
| `STAFF` | Yönetim şirketi personeli | Talep yönetimi, operasyonel görevler |
| `RESIDENT` | Daire sakini | Borç görme, ödeme, talep bildirme, duyuru okuma |

---

## Teknik Mimari (Özet)

### Monorepo
```
sakin/
├── api/                  # NestJS 11 — REST API (port 3001)
├── client/
│   ├── admin/            # Next.js 15 App Router (port 3000)
│   ├── mobile/           # Expo SDK 53, React Native
│   └── platform/         # Next.js 15 — SUPER_ADMIN paneli
├── packages/
│   ├── database/         # Prisma 6, PostgreSQL (@sakin/database)
│   └── shared/           # Zod şemaları, tipler, enum'lar (@sakin/shared)
└── doc/                  # İş alanı dokümanları
```

**Build sırası**: shared → database → ui → api / admin / mobile

### Tech Stack
| | |
|--|--|
| Backend | NestJS 11 + Fastify + TypeScript |
| Admin Panel | Next.js 15 (App Router) + Tailwind |
| Mobile | Expo SDK 53 + Expo Router |
| Veritabanı | PostgreSQL + Prisma 6 |
| Auth | Firebase (telefon OTP → mobil / email → admin) |
| Ödeme | iyzico |
| Validasyon | Zod — @sakin/shared'da, hem API hem frontend kullanır |

### Domain Modeli
```
Tenant (Yönetim Şirketi)
├── User
└── Site (Apartman / Site)
    ├── Block (Blok — opsiyonel)
    └── Unit (Daire)
        ├── Resident (OWNER | TENANT)
        └── Dues [@@unique: unitId + ay + yıl]
            └── Payment (iyzico veya manuel)
```

### Multi-Tenant
Row-level tenancy — her tabloda `tenantId`.
`PrismaService.forTenant(tenantId)` → Prisma Client Extensions ile her sorguya otomatik filtre.
SaaS geçişinde yalnızca `prisma.service.ts` değişir, servisler dokunulmaz.

```
Request → TenantMiddleware (Firebase → tenantId+role) → Controller → Service.forTenant() → DB
```

### API
- Base: `http://localhost:3001/api/v1`
- Swagger: `http://localhost:3001/api/docs` (dev)
- Response: `{ "data": ... }` | Hata: `{ "statusCode", "message", "details" }`

### API Modülleri
`auth`, `site`, `unit`, `resident`, `occupancy`, `dues`, `payment`, `ledger`, `expense`, `announcement`, `export`, `tenant`, `platform`, `notification`

---

## Faz Durumu

### Faz 1 — Çekirdek ✅ Tamamlandı
- [x] Monorepo altyapısı (pnpm + Turborepo)
- [x] Prisma schema — tam domain modeli (22 model)
- [x] Multi-tenant middleware + `PrismaService.forTenant()`
- [x] Auth modülü (Firebase email/phone + dev bypass)
- [x] Site, Block, Unit, Resident, Occupancy modülleri (CRUD)
- [x] Dues modülü (toplu üretim, overdue, waive, daily cron)
- [x] Payment modülü (iyzico checkout, manuel, banka transferi, webhook + HMAC)
- [x] Ledger modülü (immutable entries, bakiye türetimi, PostgreSQL trigger)
- [x] Expense, Announcement modülleri
- [x] Export modülü (CSV — COLLECTIONS/DUES/LEDGER, batch history)
- [x] Tenant modülü (work-summary, work-portfolio, gateway config)
- [x] Platform modülü (tenant CRUD, plan yönetimi, PlatformGuard)
- [x] Notification modülü (in-app kayıt, unread count)
- [x] Admin panel → API tam entegrasyon (dashboard, work/*, reports, settings)
- [x] Mobile → API tam entegrasyon (dues, ödeme WebView, bildirimler)
- [x] `pnpm typecheck` → sıfır hata

### Faz 2
- [ ] Talep/arıza yönetimi (ticket sistemi)
- [ ] Push notification (Firebase FCM)
- [ ] WhatsApp / SMS entegrasyonu
- [ ] Çalışan takibi
- [ ] Refund otomasyonu

### Faz 3
- [ ] Raporlama (tahsilat oranı, aging, site bazlı mali durum)
- [ ] Self-serve SaaS onboarding

---

## Dokümantasyon

`doc/` altında 10 referans doküman bulunur. Geliştirme öncesi mutlaka okunmalı.

| # | Doküman | Kapsam |
|---|---------|--------|
| 01 | MIMARI-GENEL-BAKIS | Sistem mimarisi, multi-tenant, request akışı |
| 02 | KIMLIK-DOGRULAMA-VE-YETKILENDIRME | Auth, guard, rol matrisi |
| 03 | VERITABANI-SEMASI | Domain modelleri, iş kuralları |
| 04 | ODEME-SISTEMI | iyzico, ödeme akışları, ledger |
| 05 | API-TASARIMI | Endpoint konvansiyonları, modül detayları |
| 06 | FRONTEND-MIMARISI | Admin, platform, mobile yapıları |
| 07 | TENANT-YASAM-DONGUSU | Onboarding, plan, konfigürasyon |
| 08 | OZELLIK-YOL-HARITASI | Faz planı, müşteri eşleştirmesi |
| 09 | ZAMANLANMIS-ISLER-VE-ENTEGRASYONLAR | Cron, webhook, dış servisler |
| 10 | GELISTIRME-KILAVUZU | Setup, konvansiyonlar, deploy |

Ek: `doc/role-access-policy.md` (rol erişim matrisi), `doc/customer-expectations/` (müşteri beklenti analizi)

---

## Geliştirme

```bash
pnpm install
pnpm db:generate          # Prisma client oluştur
pnpm db:migrate:dev       # Migration (PostgreSQL gerekli)
pnpm db:seed              # Demo veri

pnpm --filter=@sakin/api dev
pnpm --filter=@sakin/admin dev
pnpm --filter=@sakin/mobile dev
pnpm dev                  # Hepsi paralel
```

**Env dosyaları:**
- `api/.env.example` → `.env`
- `client/admin/.env.example` → `.env.local`
- `packages/database/.env.example` → `.env`
