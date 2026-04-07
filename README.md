# Sakin — Bina Yönetim Platformu

Kayseri / Konya gibi iç Anadolu şehirlerinde bina yönetim hizmetleri veren şirketler için çok kiracılı SaaS platformu. Aidat takibi, online tahsilat, gider yönetimi ve sakin iletişimini tek sistemde toplar.

## Monorepo Yapısı

```
sakin/
├── apps/
│   ├── api/        # NestJS 11 + Fastify — REST API (port 3001)
│   ├── admin/      # Next.js 15 App Router — Yönetim paneli (port 3000)
│   ├── mobile/     # Expo SDK 53 + React Native — Sakin uygulaması
│   └── platform/   # Next.js — Super admin paneli (port 3002)
├── packages/
│   ├── database/   # Prisma 6 + PostgreSQL (@sakin/database)
│   ├── shared/     # Zod şemaları, tipler, enum'lar (@sakin/shared)
│   └── ui/         # shadcn/ui bileşenler (@sakin/ui)
└── doc/            # Mimari ve iş alanı dokümanları
```

## Gereksinimler

- Node.js 20+
- pnpm 9+
- Docker (PostgreSQL için)
- Firebase projesi (auth için)

## Hızlı Başlangıç

### 1. Bağımlılıkları Yükle

```bash
pnpm install
```

### 2. Ortam Değişkenlerini Ayarla

```bash
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env.local
cp packages/database/.env.example packages/database/.env
```

Her `.env` dosyasını kendi Firebase ve iyzico bilgilerinle doldur.

### 3. Veritabanını Başlat

```bash
docker compose up -d          # PostgreSQL'i ayağa kaldır
pnpm db:generate              # Prisma client oluştur
pnpm db:migrate:dev           # Migration uygula
pnpm db:seed                  # Demo veri yükle
```

### 4. Geliştirme Sunucularını Başlat

```bash
pnpm dev                      # Tüm uygulamaları paralel başlatır
```

Veya tek tek:

```bash
pnpm --filter=@sakin/api dev
pnpm --filter=@sakin/admin dev
pnpm --filter=@sakin/mobile dev
```

## Önemli URL'ler (Dev)

| Uygulama | URL |
|----------|-----|
| Admin Panel | http://localhost:3000 |
| API | http://localhost:3001/api/v1 |
| Swagger | http://localhost:3001/api/docs |
| Platform | http://localhost:3002 |

## Temel Komutlar

```bash
pnpm typecheck              # TypeScript kontrolü (tüm paketler)
pnpm build                  # Production build
pnpm db:studio              # Prisma Studio (veritabanı arayüzü)
pnpm db:seed                # Demo veri
```

## Mimari Özeti

**Multi-tenancy:** Row-level tenancy — her tabloda `tenantId`. `PrismaService.forTenant(tenantId)` Prisma Client Extensions ile her sorguya otomatik tenant filtresi ekler.

**Auth:** Firebase Authentication. Admin panel → email/şifre. Mobil → telefon OTP. Dev ortamında `x-dev-tenant-id` header ile bypass.

**Finansal model:**
- `Dues` — aidat tahakkuku (daire + dönem bazlı, idempotent)
- `Payment` — tahsilat olayı (iyzico veya manuel)
- `LedgerEntry` — immutable finansal defter (bakiye bu tablodan türetilir, asla stored column değil)

**Ödeme:** iyzico entegrasyonu. Checkout form HTML → mobil WebView. Webhook HMAC-SHA256 imza doğrulaması. Idempotent webhook işleme.

```
Request → TenantMiddleware → Controller → Service.forTenant() → DB
```

## Ortam Değişkenleri

### `apps/api/.env`

```env
DATABASE_URL=postgresql://sakin:sakin_dev_pass@localhost:5432/sakin_dev
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
IYZICO_API_KEY=sandbox-...
IYZICO_SECRET_KEY=sandbox-...
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
```

### `apps/admin/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

## Dokümanlar

| Dosya | İçerik |
|-------|--------|
| [doc/DB&BACKEND-ARC.md](doc/DB&BACKEND-ARC.md) | Veritabanı ve backend mimari kararları |
| [doc/PAYMENT.md](doc/PAYMENT.md) | Ödeme altyapısı ve iyzico entegrasyon mimarisi |
| [doc/CUTOVER-V2-RUNBOOK.md](doc/CUTOVER-V2-RUNBOOK.md) | Production deployment runbook |
| [doc/role-access-policy.md](doc/role-access-policy.md) | Rol ve erişim politikaları |
| [CLAUDE.md](CLAUDE.md) | AI geliştirme bağlamı |

## Roller

| Rol | Kim | Erişim |
|-----|-----|--------|
| `SUPER_ADMIN` | Platform sahibi | `apps/platform` — tenant yönetimi |
| `TENANT_ADMIN` | Yönetim şirketi yöneticisi | `apps/admin` — tüm operasyon |
| `STAFF` | Şirket personeli | `apps/admin` — kısıtlı operasyon |
| `RESIDENT` | Daire sakini | `apps/mobile` — borç, ödeme, bildirim |
