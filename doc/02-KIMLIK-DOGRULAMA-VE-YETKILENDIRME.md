# 02 — Kimlik Dogrulama ve Yetkilendirme

> Ilgili dokumanlar: 01-MIMARI-GENEL-BAKIS, role-access-policy.md

---

## Kimlik Dogrulama (Authentication)

Firebase Auth kullanilir. Iki farkli giris yontemi:

| Uygulama | Yontem | Neden |
|----------|--------|-------|
| Mobil (sakin) | Telefon OTP | Sakinler email kullanmaz, telefon numarasi dogal kimlik |
| Admin panel | Email + sifre | Ofis ortami, kurumsal kullanim |
| Platform panel | Email + sifre | Sistem yoneticileri |

### Akis

1. Kullanici giris yapar (Firebase SDK)
2. Firebase bir JWT token verir
3. Her API isteginde bu token `Authorization: Bearer <token>` header'inda gonderilir
4. API tarafinda Firebase Admin SDK ile token dogrulanir
5. Token icindeki `uid` ile veritabanindaki kullanici eslestirilir

### Neye Dikkat Edilmeli
- Token suresi Firebase tarafindan yonetilir (~1 saat), client SDK otomatik yeniler
- API tarafinda token cache'lenmemeli — her istek dogrulanmali
- Kullanicinin `isActive` alani kontrol edilmeli — hesap kapatilmissa token gecerli olsa bile erisim engellenmeli
- Tenant'in `isActive` alani da kontrol edilmeli — askiya alinmis tenant'in kullanicilari giremez

---

## Dev Bypass

Gelistirme ortaminda Firebase olmadan calisabilmek icin:

- `x-dev-tenant-id: <tenantId>` → O tenant'in admin'i gibi davranir
- `x-dev-tenant-id: super` → SUPER_ADMIN gibi davranir

**Sadece `NODE_ENV !== 'production'` oldugunda aktif.** Uretimde bu header'lar etkisizdir.

---

## Yetkilendirme (Authorization)

Iki katmanli koruma:

### 1. TenantMiddleware
Her istekte calisir. Token'dan kullaniciyi bulur, tenant'ini belirler, `tenantContext` nesnesini request'e ekler.

`tenantContext` icerigi:
- `tenantId` — hangi tenant
- `userId` — kim
- `role` — ne yetkisi var
- `firebaseUid` — Firebase kimligi
- `userTenantRoleId` — hangi rol kaydi

### 2. RolesGuard + @Roles Decorator
Controller seviyesinde calisir. Endpoint'e erisim icin gerekli rolleri kontrol eder.

```
@Roles('TENANT_ADMIN')           → Sadece tenant yoneticisi
@Roles('TENANT_ADMIN', 'STAFF')  → Yonetici veya personel
@Public()                        → Herkes (auth gerekmez)
```

### 3. PlatformGuard
Platform endpointleri (`/platform/*`) icin ozel guard. Sadece `SUPER_ADMIN` erisir.

---

## Rol Erisim Matrisi

STAFF rolu, TENANT_ADMIN tarafindan davet edilen sinirli yetkili operasyon kullanicisidir. Finansal karar, site/daire/aidat yapilandirmasi, raporlama ve tenant ayarlari TENANT_ADMIN'in isidir. STAFF gunluk saha operasyonuna odaklanir: sakin yonetimi, manuel tahsilat girisi, gider ve duyuru.

### Admin Panel Route'lari

| Route | TENANT_ADMIN | STAFF |
|-------|:---:|:---:|
| /dashboard | ✓ | ✗ |
| /sites | ✓ | ✗ |
| /units | ✓ | ✗ |
| /residents | ✓ | ✓ |
| /dues, /dues-create | ✓ | ✗ |
| /payments | ✓ | ✓ |
| /finance, /cash | ✓ | ✗ |
| /expenses | ✓ | ✓ |
| /announcements | ✓ | ✓ |
| /reports | ✓ | ✗ |
| /users, /settings, /onboarding | ✓ | ✗ |

STAFF giris sonrasi landing: `/residents`.

### API Endpoint'leri — STAFF Ozeti

| Modul | STAFF |
|-------|-------|
| site, unit | read only |
| resident | list/create/update + detail (soft-delete TA) |
| dues | read only (list/detail) |
| payment | list/detail + manuel tahsilat + banka transferi onay (refund/gateway TA) |
| ledger | read (tahsilat baglami icin gerekli) |
| expense | read-write (delete + distribute TA) |
| announcement | read-write (delete TA) |
| notification | kendi bildirimleri |
| tenant | — (tumu TA) |
| occupancy, export | — |
| Faz 2 moduller (ticket, cash-account, facility, meeting, document, contract, site-staff, communication) | — (TA) |

Detayli matris icin: `doc/role-access-policy.md`.

### Kullanici Kayit / Davet

- `POST /auth/register` — yalnizca `RESIDENT` kayit olabilir. STAFF public register ile olusturulamaz.
- STAFF kullanici davet akisiyla eklenir: `POST /tenant/users` — sadece TENANT_ADMIN.

### Neye Dikkat Edilmeli
- Yeni endpoint eklendiginde **mutlaka** `@Roles()` decorator'u konmali
- Decorator unutulursa RolesGuard varsayilan olarak **reddeder** (guvenli taraf)
- STAFF'a yeni bir modul/route acarken hem `role-access-policy.md` hem bu matris guncellenmeli
- Platform endpointlerine tenant kullanicilari **asla** erisememeli

---

## Middleware Harici Route'lar

Su route'lar TenantMiddleware'den muaf:

- `health` — saglik kontrolu
- `auth/register` — yeni kayit (henuz token yok)
- `auth/dev-bootstrap` — gelistirme ortami baslangic verisi
- `payments/webhooks/iyzico` — odeme bildirimi (iyzico'dan gelir, kullanici token'i yok)
- `internal/v1/notifications/*` — dahili bildirim tetiklemesi

### Neye Dikkat Edilmeli
- Webhook endpoint'leri farkli guvenlik mekanizmasi kullanir (HMAC imza dogrulama)
- Yeni bir public endpoint eklenirken middleware exclude listesine eklemeyi unutma
- Exclude listesi mumkun oldugunca kisa tutulmali
