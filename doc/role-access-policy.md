# Role Access Policy (v1)

Bu doküman API endpoint ve web route erişim politikasını özetler.

## Roller

- `SUPER_ADMIN`: Platform seviyesi yönetim.
- `TENANT_ADMIN`: Şirket seviyesi yönetim.
- `STAFF`: Şirket operasyon kullanıcısı.

## Web Uygulamaları

- `client/platform`: Sadece `SUPER_ADMIN`.
- `client/admin`: Tenant scoped panel (`TENANT_ADMIN` + `STAFF`).

`apps/admin` route politikası:

- Sadece `TENANT_ADMIN`: `/dashboard`, `/sites`, `/dues`, `/reports`, `/settings`
- `TENANT_ADMIN` + `STAFF`: `/residents`, `/payments`, `/work/*`

## API Politikası

- `/platform/*`: Sadece `SUPER_ADMIN` (`PlatformGuard`).
- Tenant operasyon endpointleri: `@Roles(...)` ile route bazında korunur.

Örnek:

- `TENANT_ADMIN` only: site create/update, dues generate/update, unit write işlemleri, resident soft-delete.
- `TENANT_ADMIN` + `STAFF`: resident list/create/update, payment list/manual, expense/announcement read-write (kritik delete hariç).

