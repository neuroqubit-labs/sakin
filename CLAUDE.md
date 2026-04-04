# Sakin — Claude Bağlamı

## Proje Özeti

**Sakin**, apartman ve site yönetim şirketlerine dijital altyapı sağlayan bir SaaS ürünüdür.

- **Şu an**: Kendi yönetim şirketimizde çalışır MVP
- **Hedef**: ~6 ay içinde SaaS ürüne geçiş
- **Pazar**: İç Anadolu bina yönetim şirketleri (Kayseri, Konya öncelikli)
- **Rakip durum**: Excel + WhatsApp tabanlı mevcut yönetim modellerini dijitalleştiriyoruz

## İş Alanı Bağlamı

Bina yönetim sektörünün temel operasyonları:

- **Aidat yönetimi**: Aylık aidat tanımlama → otomatik borç oluşturma → tahsilat takibi
- **Ödeme akışı**: Sakin mobil uygulama üzerinden iyzico ile ödeme → borç otomatik düşümü
- **Talep/arıza yönetimi**: Sakin → yönetici iletişim kanalı (elektrik, temizlik vb. kategoriler)
- **Personel yönetimi**: Güvenlik, temizlik personeli vardiya ve görev takibi (Faz 2+)
- **Duyuru sistemi**: Toplu SMS/push notification, borç hatırlatmaları
- **Raporlama**: Tahsilat oranı, gecikmiş borçlar, daire bazlı durum

**Kritik iş kuralları:**
- Bir daire için aynı ay/yıl ikinci kez aidat oluşturulamaz (idempotent)
- Ödeme yapıldığında `Dues.paidAmount` güncellenir, tam ödeme → `status: PAID`
- Vadesi geçmiş `PENDING` aidatlar → `OVERDUE` (cron veya manuel tetik)
- Sakin ev sahibi (`OWNER`) veya kiracı (`TENANT`) olabilir; ödeme sorumluluğu farklılaşabilir

## Monorepo Yapısı

```
sakin/
├── apps/
│   ├── api/          # NestJS 11 — REST API, port 3001
│   ├── admin/        # Next.js 15 — yönetim paneli, port 3000
│   └── mobile/       # Expo SDK 53 — sakin mobil uygulaması
├── packages/
│   ├── database/     # Prisma 6 schema + PrismaClient
│   ├── shared/       # Zod şemaları, TypeScript tipleri, enum'lar (@sakin/shared)
│   └── ui/           # shadcn/ui tabanlı React bileşenler (@sakin/ui)
├── doc/              # İş alanı dokümanları (referans)
├── CLAUDE.md         # Bu dosya
└── turbo.json
```

**Bağımlılık grafiği** (build sırası):
```
packages/shared → (bağımlılığı yok, önce build edilir)
packages/database → (bağımlılığı yok, önce build edilir)
packages/ui → (bağımlılığı yok, önce build edilir)
apps/api → @sakin/database + @sakin/shared
apps/admin → @sakin/shared + @sakin/ui
apps/mobile → @sakin/shared
```

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Monorepo | pnpm workspaces + Turborepo 2 |
| Backend | NestJS 11, TypeScript, Fastify adapter |
| Admin Panel | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Mobile | Expo SDK 53, React Native, Expo Router |
| Veritabanı | PostgreSQL + Prisma 6 |
| Auth | Firebase Authentication (telefon OTP mobil / email-şifre admin) |
| Ödeme | iyzico |
| Bildirim | Firebase FCM (Faz 2) |
| Validasyon | Zod — şemalar @sakin/shared'da, hem API hem frontend kullanır |
| UI | shadcn/ui (admin panel) |

## Domain Modeli

```
Tenant (Yönetim Şirketi)
├── User (SUPER_ADMIN | TENANT_ADMIN | STAFF | RESIDENT)
├── Site (Apartman / Site)
│   ├── Block (Blok — opsiyonel)
│   └── Unit (Daire — number + floor + type)
│       ├── Resident (OWNER | TENANT — userId nullable)
│       │   └── Payment
│       └── Dues (@@unique: unitId + periodMonth + periodYear)
│           └── Payment (ONLINE | CASH | BANK_TRANSFER)
```

**Enum'lar** (`packages/shared/src/enums/index.ts`):
- `UserRole`: SUPER_ADMIN, TENANT_ADMIN, STAFF, RESIDENT
- `ResidentType`: OWNER, TENANT
- `UnitType`: APARTMENT, COMMERCIAL, STORAGE, PARKING
- `DuesStatus`: PENDING, PAID, OVERDUE, PARTIALLY_PAID, WAIVED
- `PaymentMethod`: ONLINE, CASH, BANK_TRANSFER
- `PaymentStatus`: PENDING, SUCCESS, FAILED, REFUNDED

## Multi-Tenant Mimarisi

**Strateji**: Row-level tenancy — her tabloda `tenantId` kolonu

```
HTTP Request
  → TenantMiddleware → Firebase token doğrulama → tenantId + role çıkarma
  → Controller → @Tenant() decorator ile tenantContext
  → Service → this.prisma.forTenant(tenantId)
  → PrismaService.$extends → tüm query/create/update/delete'e tenantId filtresi
  → PostgreSQL
```

**Kritik dosyalar:**
- `apps/api/src/prisma/prisma.service.ts` — `forTenant()` Prisma Client Extensions
- `apps/api/src/common/middleware/tenant.middleware.ts` — Firebase → tenantContext
- `apps/api/src/app.module.ts` — middleware binding (`/auth/register` hariç)

**SaaS geçişinde**: Yalnızca `prisma.service.ts` değişir; servisler/controller'lar dokunulmaz.

## API Yapısı

**Base URL**: `http://localhost:3001/api/v1`
**Swagger**: `http://localhost:3001/api/docs` (dev modda)

**Mevcut modüller:**
- `auth` — Firebase token doğrulama, kullanıcı kaydı/profil
- `site` — Site CRUD
- `dues` — Aidat oluşturma (toplu), listeleme, güncelleme, overdue işaretleme
- `site`, `unit`, `resident`, `payment`, `tenant` — stub (geliştirilecek)

**Response formatı** (TransformInterceptor):
```json
{ "data": ... }
```

**Hata formatı** (AllExceptionsFilter):
```json
{ "statusCode": 400, "message": "...", "error": "Bad Request", "details": [...] }
```

## Admin Panel Yapısı

**Port**: 3000

```
/login                    → Firebase email/password
/(dashboard)/
  dashboard/              → Genel özet (tahsilat oranı, gecikmiş borçlar)
  sites/                  → Site listesi + oluşturma
  residents/              → Sakin listesi
  dues/                   → Aidat listesi
  dues/generate/          → Toplu aidat oluşturma formu
  payments/               → Ödeme geçmişi, manuel ödeme girişi
```

## Mobile Yapısı

Expo Router + Firebase Auth (telefon OTP)

```
(auth)/login              → Telefon numarası + SMS OTP
(tabs)/
  index                   → Borç özeti (DuesStatus'a göre renkli)
  pay                     → iyzico ödeme (Faz 1)
  tickets                 → Talep yönetimi (Faz 2 stub)
  announcements           → Duyurular (Faz 2 stub)
```

## Faz Yol Haritası

### Faz 1 — Çekirdek (Şu an)
- [x] Monorepo altyapısı
- [x] Prisma schema (tam domain modeli)
- [x] Multi-tenant middleware
- [x] Auth modülü
- [x] Site modülü
- [x] Dues modülü (toplu oluşturma, listeleme)
- [ ] Unit modülü (CRUD)
- [ ] Resident modülü (CRUD)
- [ ] Payment modülü (manuel ödeme + iyzico)
- [ ] Dues → Payment entegrasyonu (ödeme sonrası paidAmount güncelleme)
- [ ] Admin panel gerçek API entegrasyonu
- [ ] Mobile gerçek API entegrasyonu

### Faz 2
- [ ] Talep/arıza yönetimi (ticket sistemi)
- [ ] Firebase FCM bildirim sistemi
- [ ] Borç hatırlatma otomasyonu

### Faz 3
- [ ] Gelişmiş raporlama
- [ ] Operasyon optimizasyonu

## Geliştirme Komutları

```bash
# Bağımlılık yükle
pnpm install

# Prisma client oluştur (schema değişince)
pnpm db:generate

# Migration (PostgreSQL bağlantısı gerekli)
pnpm db:migrate:dev

# Seed verisi
pnpm db:seed

# Tek uygulama geliştirme
pnpm --filter=@sakin/api dev
pnpm --filter=@sakin/admin dev
pnpm --filter=@sakin/mobile dev

# Tüm uygulamalar paralel
pnpm dev

# Typecheck
pnpm typecheck
```

**Ortam değişkenleri:**
- `apps/api/.env.example` → `apps/api/.env`
- `apps/admin/.env.example` → `apps/admin/.env.local`
- `packages/database/.env.example` → `packages/database/.env`

## Kapsam Dışı (Bilinçli Olarak)

Şu an ve yakın gelecekte **yapılmayacaklar**:
- ERP seviyesinde muhasebe (e-fatura, e-defter)
- Gelişmiş BI / analitik
- Yapay zeka önerileri
- Çoklu dil / uluslararası kullanım
- Genel kurul / oylama sistemi
- Karmaşık gecikme faizi hesaplama

## Tasarım Prensipleri

1. **Basitlik**: Excel kullanan bir yönetici adapte edebilmeli
2. **Şeffaflık**: Tüm finansal hareketler izlenebilir
3. **Güvenilirlik**: Ödeme/borç sistemi hataya kapalı (idempotent operasyonlar)
4. **Operasyon odaklılık**: Teorik değil, günlük iş akışına göre tasarla
5. **MVP önce**: Çalışır sistem üzerinde geliştir, kapsam kaymasından kaçın
