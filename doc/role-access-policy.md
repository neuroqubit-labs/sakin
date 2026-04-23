# Role Access Policy (v2)

Bu doküman API endpoint ve web route erişim politikasını özetler. STAFF rolü, TENANT_ADMIN tarafından davet edilen sınırlı yetkili operasyon kullanıcısıdır.

## Roller

- `SUPER_ADMIN`: Platform seviyesi yönetim.
- `TENANT_ADMIN`: Şirket seviyesi yönetim. Hesap sahibi, tüm finansal ve yapılandırma kararları bu rolde.
- `STAFF`: Şirket operasyon kullanıcısı. TENANT_ADMIN tarafından davet edilir; günlük saha operasyonlarını yürütür.
- `RESIDENT`: Daire sakini.

## Web Uygulamaları

- `client/platform`: Sadece `SUPER_ADMIN`.
- `client/admin`: Tenant scoped panel (`TENANT_ADMIN` + `STAFF`).
- `client/mobile`: Sadece `RESIDENT`.

### client/admin route politikası

| Route | TENANT_ADMIN | STAFF |
|-------|:---:|:---:|
| `/dashboard` | ✓ | ✗ |
| `/sites` | ✓ | ✗ |
| `/units` | ✓ | ✗ |
| `/residents` | ✓ | ✓ |
| `/dues` | ✓ | ✗ |
| `/dues-create` | ✓ | ✗ |
| `/payments` | ✓ | ✓ |
| `/finance` | ✓ | ✗ |
| `/cash` | ✓ | ✗ |
| `/expenses` | ✓ | ✓ |
| `/announcements` | ✓ | ✓ |
| `/reports` | ✓ | ✗ |
| `/users` | ✓ | ✗ |
| `/settings` | ✓ | ✗ |
| `/onboarding` | ✓ | ✗ |

STAFF giriş yaptıktan sonra landing sayfası `/residents`.

## API Politikası

- `/platform/*`: Sadece `SUPER_ADMIN` (`PlatformGuard`).
- Tenant operasyon endpointleri: `@Roles(...)` ile route bazında korunur. Decorator yoksa `RolesGuard` varsayılan olarak reddeder.

### Modül bazlı STAFF matrisi

| Modül | STAFF erişimi |
|-------|---------------|
| `site` | read (list/detail) |
| `unit` | read (list/detail/blocks) |
| `resident` | list/create/update + detail. Soft-delete ve aktivasyon işlemleri TA'da. |
| `occupancy` | — (STAFF kapalı) |
| `dues` | read-only (list/detail). Generate/update/waive/policy/period/bulk/overdue TA'da. |
| `payment` | list/detail + manuel tahsilat (nakit/EFT) + banka transferi onay. Refund ve gateway config TA'da. |
| `ledger` | read (daire bakiyesi, entry list). Tahsilat bağlamı için gereklidir. |
| `expense` | read-write. Delete ve `/distribute` (dairelere borç dağıtma) TA'da. |
| `announcement` | read-write (create/list/detail/update). Delete TA'da. |
| `notification` | kendi bildirimleri (list, mark-read, unread-count). |
| `tenant` | — (tümü TA). Kendi profil bilgileri `auth/me` üzerinden gelir. |
| `export` | — (STAFF kapalı) |
| Faz 2 modülleri (`ticket`, `cash-account`, `facility`, `meeting`, `document`, `contract`, `site-staff`, `communication`, `vendor`) | — (TA). İleride ihtiyaç oluşursa bu matrise eklenerek açılır. |

### Kullanıcı yönetimi

- STAFF kullanıcı davet akışıyla eklenir (`POST /tenant/users` — sadece TA).
- `POST /auth/register` üzerinden yalnızca `RESIDENT` rolü kayıt olabilir. STAFF public register ile oluşturulamaz.
