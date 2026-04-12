# Service Boundary + Table Ownership Freeze (S1-01)

Bu dokuman, Service Deploy donusumu icin Sprint 1 kapsaminda servis sinirlarini ve tablo ownership dagilimini dondurur.

- Issue: `S1-01 | Service boundary + table ownership freeze`
- Durum: `Frozen (Sprint 1 baseline)`
- Gecerlilik: Sprint 1 ve Sprint 2 boyunca degisiklikler ADR ile yapilir.

## 1) Servis Sinirlari (Freeze)

- `api-auth`: auth, token dogrulama, tenant context, platform-level kimlik ve erisim baglami
- `api-metadata`: site, block, unit, resident, occupancy
- `api-finance`: dues, payment, ledger, export
- `api-support`: notification, announcement, expense

Not: `platform` ve `tenant management` endpointleri gecis surecinde `api-auth` baglaminda ele alinir.

## 2) Modul Ownership (Kod Seviyesi)

| Mevcut Modul | Hedef Servis | Not |
|---|---|---|
| `auth` | `api-auth` | Token dogrulama ve kayit akislari |
| `tenant` | `api-auth` | Tenant context/read isleri |
| `platform` | `api-auth` | Super admin operasyonlari (gecis asamasi) |
| `site` | `api-metadata` | Fiziksel yapi |
| `unit` | `api-metadata` | Unit + block route'lari |
| `resident` | `api-metadata` | Kisi profilleri |
| `occupancy` | `api-metadata` | Unit-resident iliski zamani |
| `dues` | `api-finance` | Tahakkuk |
| `payment` | `api-finance` | Tahsilat, webhook |
| `ledger` | `api-finance` | Finansal gercek kaynak |
| `export` | `api-finance` | Finansal export batch |
| `notification` | `api-support` | Bildirim |
| `announcement` | `api-support` | Duyuru |
| `expense` | `api-support` | Gider |

## 3) Tablo Ownership (DB Seviyesi)

| Model | Owner Servis | Not |
|---|---|---|
| `User` | `api-auth` | Kimlik kullanicisi |
| `UserTenantRole` | `api-auth` | Rol baglami |
| `Tenant` | `api-auth` | Tenant temel varligi |
| `TenantPlan` | `api-auth` | Plan bilgisi |
| `TenantPaymentGatewayConfig` | `api-finance` | Odeme saglayici konfig |
| `Site` | `api-metadata` | Fiziksel yapi |
| `Block` | `api-metadata` | Fiziksel yapi |
| `Unit` | `api-metadata` | Finans merkezi varlik |
| `Resident` | `api-metadata` | Kisi kaydi |
| `UnitOccupancy` | `api-metadata` | Unit-kisi iliski zamani |
| `DuesDefinition` | `api-finance` | Tahakkuk tanimi |
| `Dues` | `api-finance` | Donemsel borc |
| `Payment` | `api-finance` | Tahsilat kaydi |
| `PaymentAttempt` | `api-finance` | Checkout girisimleri |
| `PaymentProviderEvent` | `api-finance` | Webhook/provider event |
| `LedgerEntry` | `api-finance` | Append-only finans hareketi |
| `ExportBatch` | `api-finance` | Export kayitlari |
| `Notification` | `api-support` | Bildirim |
| `Announcement` | `api-support` | Duyuru |
| `Expense` | `api-support` | Gider |
| `AuditLog` | `Cross-service` | Istisna: islem yapan servis kendi olayini yazar |

## 4) Cross-Service Iletisim Kurali

- Servisler arasi dogrudan modul importu yasaktir.
- Zorunlu entegrasyonlar `internal contract + adapter` ile yapilir.
- Ilk zorunlu contract: `finance -> support` (payment notification side-effect).

## 5) Import Guard Kurallari (Policy)

## Kural Seti

- Bir servis sadece kendi modul/agacindan import yapar.
- Ortak kod sadece paylasilan paketlerden gelir:
  - `@sakin/shared`
  - `@sakin/database`
  - Sprint 1 sonrasi eklenecek ortak cekirdek paket(ler)i
- `apps/api/src/modules/*` altinda baska servis ownership'indeki modulden dogrudan import yasaktir.

## Ornek

- Yasak: `payment.service.ts` icinden `../notification/notification.service` importu
- Serbest: internal contract client importu (ornek: `@sakin/contracts/support-client`)

## Enforce

- CI'da static check/lint ile fail-fast zorunlu.
- Ilk hedef enforcement asamasi: `S1-08`.
- Ilk kanit: `S1-05` ve `S1-06` tasima PR'lari.

## 6) Karar Notlari (ADR Ozet)

| ADR ID | Karar | Gerekce |
|---|---|---|
| `ADR-SD2-001` | Servis sinirlari 4 servis olarak donduruldu | Kademeli deploy + dusuk riskli gecis |
| `ADR-SD2-002` | Table ownership tek owner prensibiyle donduruldu | Migration ve deploy sorumlulugu netlestirme |
| `ADR-SD2-003` | Cross-service direct import yasagi benimsendi | Bagimlilik kacagini engelleme |
| `ADR-SD2-004` | Deploy sira bagimliligi `auth -> metadata -> support -> finance` | Runtime `payment -> notification` bagimliligi |

## 7) Degisiklik Proseduru

- Bu freeze dokumanindaki degisiklikler yalniz ADR + review ile yapilir.
- Sprint 1-2 disinda kapsam genisletilecekse backlog revizyonu zorunludur.
