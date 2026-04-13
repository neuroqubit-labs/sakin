# Sakin — Bina Yönetim Platformu

Kayseri / Konya gibi iç Anadolu şehirlerinde bina yönetim hizmetleri veren şirketler için çok kiracılı SaaS platformu. Aidat takibi, online tahsilat, gider yönetimi ve sakin iletişimini tek sistemde toplar.

## Monorepo Yapısı

```
sakin/
├── api/            # NestJS 11 + Fastify — REST API (port 3001)
├── client/
│   ├── admin/      # Next.js 15 App Router — Yönetim paneli (port 3000)
│   ├── mobile/     # Expo SDK 53 + React Native — Sakin uygulaması
│   ├── platform/   # Next.js — Super admin paneli (port 3002)
│   └── web/        # Next.js 15 — Kurumsal web sitesi (port 3003)
├── packages/
│   ├── database/   # Prisma 6 + PostgreSQL (@sakin/database)
│   └── shared/     # Zod şemaları, tipler, enum'lar (@sakin/shared)
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
cp api/.env.example api/.env
cp client/admin/.env.example client/admin/.env.local
cp client/web/.env.example client/web/.env.local
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

Servis shell'lerini (en az finance + metadata) tek komutla ayağa kaldırmak için:

```bash
npm run dev:services
```

Veya tek tek:

```bash
pnpm --filter=@sakin/api dev
pnpm --filter=@sakin/admin dev
pnpm --filter=@sakin/web dev
pnpm --filter=@sakin/mobile dev
```

## Önemli URL'ler (Dev)

| Uygulama | URL |
|----------|-----|
| Admin Panel | http://localhost:3000 |
| API | http://localhost:3001/api/v1 |
| Swagger | http://localhost:3001/api/docs |
| Platform | http://localhost:3002 |
| Kurumsal Web | http://localhost:3003 |

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

### `api/.env`

```env
DATABASE_URL=postgresql://sakin:sakin_dev_pass@localhost:5432/sakin_dev
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
IYZICO_API_KEY=sandbox-...
IYZICO_SECRET_KEY=sandbox-...
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
```

### `client/admin/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

### `client/web/.env.local`

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3003
NEXT_PUBLIC_ADMIN_URL=https://admin.sakinyonetim.tr
```

## Dokümanlar

| Dosya | İçerik |
|-------|--------|
| [doc/DB&BACKEND-ARC.md](doc/DB&BACKEND-ARC.md) | Veritabanı ve backend mimari kararları |
| [doc/PAYMENT.md](doc/PAYMENT.md) | Ödeme altyapısı ve iyzico entegrasyon mimarisi |
| [doc/CUTOVER-V2-RUNBOOK.md](doc/CUTOVER-V2-RUNBOOK.md) | Production deployment runbook |
| [doc/SERVICE-BOUNDARY-OWNERSHIP-FREEZE.md](doc/SERVICE-BOUNDARY-OWNERSHIP-FREEZE.md) | Servis sınırları, tablo ownership freeze ve import guard kuralları |
| [doc/S1-07A-INTERNAL-HTTP-CONTRACTS.md](doc/S1-07A-INTERNAL-HTTP-CONTRACTS.md) | S1-07a minimum internal HTTP contract seti (sync v1) |
| [doc/S1-07B-FINANCE-SUPPORT-ADAPTER-SMOKE.md](doc/S1-07B-FINANCE-SUPPORT-ADAPTER-SMOKE.md) | S1-07b payment notification adapter implementasyon ve smoke notlari |
| [doc/S1-05-FINANCE-MODULE-MOVE-FIRST-PASS.md](doc/S1-05-FINANCE-MODULE-MOVE-FIRST-PASS.md) | S1-05 finance modullerinin api-finance'e ilk-pass tasima notu |
| [doc/S1-06-METADATA-MODULE-MOVE-FIRST-PASS.md](doc/S1-06-METADATA-MODULE-MOVE-FIRST-PASS.md) | S1-06 metadata modullerinin api-metadata'ya ilk-pass tasima notu |
| [doc/S1-08-IMPORT-GUARD-ENFORCEMENT.md](doc/S1-08-IMPORT-GUARD-ENFORCEMENT.md) | S1-08 cross-service import guard enforcement ve fail-fast kaniti |
| [doc/S1-09-LOCAL-MULTI-SERVICE-RUN.md](doc/S1-09-LOCAL-MULTI-SERVICE-RUN.md) | S1-09 local multi-service run komutu ve port/env standardi |
| [doc/S1-10-SPRINT-1-SMOKE-REPORT.md](doc/S1-10-SPRINT-1-SMOKE-REPORT.md) | S1-10 Sprint 1 zorunlu smoke maddeleri, sonuc matrisi ve blocker listesi |
| [doc/S1-11-API-AUTH-TENANT-CONTEXT-ADR.md](doc/S1-11-API-AUTH-TENANT-CONTEXT-ADR.md) | S1-11 api-auth tenant context strateji karari (ADR) |
| [doc/SERVICE-DEPLOY-2-SPRINT-BACKLOG.md](doc/SERVICE-DEPLOY-2-SPRINT-BACKLOG.md) | Tek repo içinde bağımsız deploy birimleri için 2 sprint backlog planı |
| [doc/SERVICE-DEPLOY-2-SPRINT-ISSUE-KIT.md](doc/SERVICE-DEPLOY-2-SPRINT-ISSUE-KIT.md) | Backlog maddelerini issue-ready formata çeviren şablon seti, PR checklist ve kapasite planı |
| [doc/TENANT-ROLE-UI-2-SPRINT-BACKLOG.md](doc/TENANT-ROLE-UI-2-SPRINT-BACKLOG.md) | Tenant-admin arayuzu icin 2 sprintlik uygulanabilir backlog |
| [doc/TENANT-ROLE-UI-ISSUE-KIT.md](doc/TENANT-ROLE-UI-ISSUE-KIT.md) | Tenant-admin backlog maddelerini issue-ready formata ceviren set |
| [doc/TENANT-ROLE-UI-S1-P0-EXECUTION-PACK.md](doc/TENANT-ROLE-UI-S1-P0-EXECUTION-PACK.md) | Tenant-admin lineer planda ilk kritik set (T1-01->T1-03) icin uygulama paketi |
| [doc/role-access-policy.md](doc/role-access-policy.md) | Rol ve erişim politikaları |
| [CLAUDE.md](CLAUDE.md) | AI geliştirme bağlamı |

## Roller

| Rol | Kim | Erişim |
|-----|-----|--------|
| `SUPER_ADMIN` | Platform sahibi | `apps/platform` — tenant yönetimi |
| `TENANT_ADMIN` | Yönetim şirketi yöneticisi | `apps/admin` — tüm operasyon |
| `STAFF` | Şirket personeli | `apps/admin` — kısıtlı operasyon |
| `RESIDENT` | Daire sakini | `apps/mobile` — borç, ödeme, bildirim |
