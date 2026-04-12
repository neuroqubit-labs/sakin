# Service Deploy Dönüşümü — 2 Sprint Issue Kit

Bu doküman, [SERVICE-DEPLOY-2-SPRINT-BACKLOG.md](SERVICE-DEPLOY-2-SPRINT-BACKLOG.md) içindeki işleri doğrudan issue açılabilir formata çevirir.

## Kullanım

1. İlgili sprint bölümünden issue başlığını ve içeriğini kopyala.
2. Issue'yu doğru etiketlerle aç (`area/*`, `type/*`, `priority/*`, `sprint/*`).
3. Bağımlılık bölümündeki issue numaralarını bağla.
4. Tamamlanan issue'lar için PR checklist zorunlu doldurulsun.

## Etiket Standardı

- `sprint/s1` `sprint/s2`
- `priority/p0` `priority/p1`
- `type/feature` `type/chore` `type/devops` `type/test`
- `area/finance` `area/metadata` `area/support` `area/auth` `area/pipeline`

---

## Sprint 1 Issue Şablonları

### S1-01 - Servis sınırları ve ownership freeze

- Title: `S1-01 | Service boundary + table ownership freeze`
- Labels: `sprint/s1`, `priority/p0`, `type/chore`, `area/pipeline`
- Estimate: `0.5d`
- Owner: `Backend Lead`
- Dependencies: `-`

#### Description

Servis sınırlarını (finance, metadata, support, auth) ve tablo sahipliğini yazılı hale getir. Çapraz import yasağı ve karar kayıtları netleştirilsin.

#### Acceptance Criteria

- [ ] Servis sınırları net ve çakışmasız dokümante edildi.
- [ ] Tablo ownership tablosu yayımlandı.
- [ ] Ekip onayı alındı (review notu).

#### Technical Tasks

- [ ] `doc/SERVICE-BOUNDARY-OWNERSHIP-FREEZE.md` dokümanını guncelle.
- [ ] Import guard kuralları yazılı hale getir.
- [ ] Karar notlarını PR açıklamasına ekle.

---

### S1-02 - Yeni servis app iskeletlerini workspace'e ekle

- Title: `S1-02 | Add api-finance/api-metadata/api-support/api-auth app shells`
- Labels: `sprint/s1`, `priority/p0`, `type/feature`, `area/pipeline`
- Estimate: `1d`
- Owner: `Backend`
- Dependencies: `S1-01`

#### Acceptance Criteria

- [ ] 4 yeni app workspace tarafından algılanıyor.
- [ ] Her app için `dev/build/typecheck` komutları çalışıyor.
- [ ] Mevcut monolit app etkilenmiyor.

#### Technical Tasks

- [ ] `pnpm-workspace.yaml` güncelle.
- [ ] App klasörleri ve `package.json` dosyalarını oluştur.
- [ ] Turbo task filtrelerini doğrula.

---

### S1-03 - Minimal Nest bootstrap

- Title: `S1-03 | Bootstrap independent Nest entrypoints per service`
- Labels: `sprint/s1`, `priority/p0`, `type/feature`, `area/pipeline`
- Estimate: `1d`
- Owner: `Backend`
- Dependencies: `S1-02`

#### Acceptance Criteria

- [ ] Servisler ayrı portlarda ayağa kalkıyor.
- [ ] Health endpointleri dönüyor.
- [ ] Ortak response formatı bozulmuyor.

#### Technical Tasks

- [ ] Her app için `main.ts` ve `app.module.ts` oluştur.
- [ ] Port/env isimlendirmesi standardize et.
- [ ] Local smoke komutları ekle.

---

### S1-04 - Ortak altyapı katmanını paylaştır

- Title: `S1-04 | Share tenant/guard/error/transform core across service apps`
- Labels: `sprint/s1`, `priority/p0`, `type/chore`, `area/auth`
- Estimate: `1.5d`
- Owner: `Backend`
- Dependencies: `S1-02`

#### Acceptance Criteria

- [ ] Tenant middleware tüm yeni servislerde aynı davranıyor.
- [ ] Roles guard ve exception/transform interceptor ortak.
- [ ] Response/error sözleşmesi tek formatta.

#### Technical Tasks

- [ ] Ortak core klasör/paket çıkar.
- [ ] Servislerde importları core katmana geçir.
- [ ] Regression smoke test çalıştır (`doc/S1-04-REGRESSION-SMOKE.md`).

---

### S1-05 - Finance modüllerini taşı (ilk pass)

- Title: `S1-05 | Move dues/payment/ledger/export into api-finance`
- Labels: `sprint/s1`, `priority/p0`, `type/feature`, `area/finance`
- Estimate: `2d`
- Owner: `Backend`
- Dependencies: `S1-03`, `S1-04`, `S1-07b`

#### Acceptance Criteria

- [ ] `api-finance` compile/typecheck geçiyor.
- [ ] Kritik endpointler smoke testte yeşil.
- [ ] Ledger idempotency davranışı korunuyor.

#### Technical Tasks

- [ ] Modülleri `api-finance` app'e taşı.
- [ ] Gereken provider/import bağımlılıklarını düzelt.
- [ ] Dues->Payment->Ledger senaryosu test et (`doc/S1-05-FINANCE-MODULE-MOVE-FIRST-PASS.md` first-pass notu).

---

### S1-06 - Metadata modüllerini taşı (ilk pass)

- Title: `S1-06 | Move site/block/unit/resident/occupancy into api-metadata`
- Labels: `sprint/s1`, `priority/p0`, `type/feature`, `area/metadata`
- Estimate: `2d`
- Owner: `Backend`
- Dependencies: `S1-03`, `S1-04`, `S1-07a`

#### Acceptance Criteria

- [ ] `api-metadata` compile/typecheck geçiyor.
- [ ] CRUD endpointleri smoke testte çalışıyor.
- [ ] Tenant filtreleme davranışı korunuyor.

#### Technical Tasks

- [ ] Modülleri `api-metadata` app'e taşı.
- [ ] Prisma tenant extension kullanımını doğrula.
- [ ] Resident/unit/occupancy akışlarını test et (`doc/S1-06-METADATA-MODULE-MOVE-FIRST-PASS.md` first-pass notu).

---

### S1-07a - Minimum internal HTTP sözleşmesi tasarımı

- Title: `S1-07a | Define minimum internal HTTP contracts (sync v1)`
- Labels: `sprint/s1`, `priority/p0`, `type/chore`, `area/pipeline`
- Estimate: `0.5d`
- Owner: `Backend Lead`
- Dependencies: `S1-03`, `S1-04`

#### Acceptance Criteria

- [ ] Internal endpoint listesi yayımlandı.
- [ ] Request/response örnekleri net.
- [ ] Timeout/retry/error standardı tanımlı.

#### Technical Tasks

- [ ] Internal contract dokumanini olustur (`doc/S1-07A-INTERNAL-HTTP-CONTRACTS.md`).
- [ ] Zorunlu header ve idempotency kurallarini netlestir.
- [ ] S1-07b implementasyonuna giris kriterlerini issue'ya bagla.

---

### S1-07b - Finance-support sync contract + adapter

- Title: `S1-07b | Implement finance-support sync contract + adapter for payment notifications`
- Labels: `sprint/s1`, `priority/p0`, `type/feature`, `area/finance`
- Estimate: `1d`
- Owner: `Backend`
- Dependencies: `S1-07a`

#### Acceptance Criteria

- [ ] Payment akışı support ile doğrudan cross-import olmadan contract/adapter üstünden konuşuyor.
- [ ] Notification side-effect smoke testte doğrulanıyor.
- [ ] Timeout/error fallback davranışı dokümante edildi.

#### Technical Tasks

- [ ] Internal client adapter katmanını ekle.
- [ ] Payment -> support çağrılarını adapter'a taşı.
- [ ] Başarılı/başarısız notification senaryolarını smoke test et (`doc/S1-07B-FINANCE-SUPPORT-ADAPTER-SMOKE.md`).

---

### S1-08 - Import guard kuralı

- Title: `S1-08 | Enforce no cross-service direct imports`
- Labels: `sprint/s1`, `priority/p1`, `type/chore`, `area/pipeline`
- Estimate: `0.5d`
- Owner: `Backend`
- Dependencies: `S1-02`, `S1-05`, `S1-06`

#### Acceptance Criteria

- [ ] Çapraz import kuralı lint veya static check ile enforce ediliyor.
- [ ] İhlal eden örnek testte fail oluyor.
- [ ] İlk gerçek taşıma PR'larında fail-fast kanıtı issue'ya eklendi (`doc/S1-08-IMPORT-GUARD-ENFORCEMENT.md`).

---

### S1-09 - Çoklu servis local run

- Title: `S1-09 | Add local multi-service run command`
- Labels: `sprint/s1`, `priority/p1`, `type/devops`, `area/pipeline`
- Estimate: `1d`
- Owner: `DevOps`
- Dependencies: `S1-02`, `S1-03`

#### Acceptance Criteria

- [ ] Tek komutla en az finance + metadata ayağa kalkıyor.
- [ ] Port çakışma ve env yönergeleri dokümante.

#### Technical Tasks

- [ ] Multi-service local run orchestrator scriptini ekle.
- [ ] `dev:services` komutunu root scriptlerine bagla.
- [ ] Port/env kilavuzunu yayinla (`doc/S1-09-LOCAL-MULTI-SERVICE-RUN.md`).

---

### S1-10 - Sprint 1 smoke raporu

- Title: `S1-10 | Produce sprint-1 smoke report`
- Labels: `sprint/s1`, `priority/p0`, `type/test`, `area/pipeline`
- Estimate: `0.5d`
- Owner: `QA + Backend`
- Dependencies: `S1-05`, `S1-06`, `S1-09`

#### Acceptance Criteria

- [ ] `dues -> payment -> ledger` + notification side-effect test edildi.
- [ ] Metadata CRUD + occupancy primary responsible akışları test edildi.
- [ ] Tüm yeni servislerde `/health` endpointi doğrulandı.
- [ ] Geçen/kalan maddeler raporlandı.
- [ ] Sprint 2 için blocker listesi çıkarıldı.

#### Technical Tasks

- [ ] Sprint 1 smoke kanit komutlarini kos ve ciktilari kaydet.
- [ ] Gecen/kalan maddeleri raporla (`doc/S1-10-SPRINT-1-SMOKE-REPORT.md`).
- [ ] Sprint 2 blocker listesini issue/PR thread'ine bagla.

---

### S1-11 - api-auth tenant context strateji kararı

- Title: `S1-11 | Lock api-auth tenant-context validation strategy`
- Labels: `sprint/s1`, `priority/p0`, `type/chore`, `area/auth`
- Estimate: `0.5d`
- Owner: `Backend Lead`
- Dependencies: `S1-04`

#### Description

`api-auth` için tenant context doğrulama yaklaşımını tek stratejiye indir: shared middleware veya auth introspection. Karar ADR ile kilitlenmeli.

#### Acceptance Criteria

- [ ] Tek strateji seçildi ve ADR ile kayıt altına alındı.
- [ ] Seçilen yaklaşımın servis migration etkisi net yazıldı.
- [ ] Ekip onayı alındı ve Sprint 2 deploy sıralamasıyla uyum doğrulandı.

#### Technical Tasks

- [ ] Strateji karşılaştırma notunu hazırla.
- [ ] ADR dokümanını yayınla (`doc/S1-11-API-AUTH-TENANT-CONTEXT-ADR.md`).
- [ ] İlgili issue/PR'lara karar linkini ekle.

---

## Sprint 2 Issue Şablonları

### S2-01 - Servis bazlı Docker image standardı

- Title: `S2-01 | Create per-service Dockerfiles and tagging standard`
- Labels: `sprint/s2`, `priority/p0`, `type/devops`, `area/pipeline`
- Estimate: `1.5d`
- Owner: `DevOps`
- Dependencies: `Sprint 1 tamam`

#### Acceptance Criteria

- [ ] `api-auth`, `api-metadata`, `api-support`, `api-finance` için image build alınıyor.
- [ ] Tag standardı (commit SHA + semver/release tag) dokümante edildi.
- [ ] Build çıktıları issue'ya eklendi.

#### Technical Tasks

- [ ] Servis bazlı Dockerfile'ları ekle.
- [ ] Ortak build arg/env standardını tanımla.
- [ ] Image naming/tagging dokümantasyonunu güncelle.

---

### S2-02 - Turbo affected-only görevleri

- Title: `S2-02 | Update Turbo tasks for affected-only service execution`
- Labels: `sprint/s2`, `priority/p0`, `type/chore`, `area/pipeline`
- Estimate: `1d`
- Owner: `Backend + DevOps`
- Dependencies: `S2-01`

#### Acceptance Criteria

- [ ] Değişen servis dışı gereksiz `build/test/typecheck` tetiklenmiyor.
- [ ] En az 2 örnek PR senaryosunda çıktı karşılaştırması issue'da paylaşıldı.
- [ ] Task filtreleri repo dokümantasyonuna işlendi.

#### Technical Tasks

- [ ] Turbo task filtrelerini servis bazlı hale getir.
- [ ] Affected hesaplama script/konvansiyonunu ekle.
- [ ] Kontrol senaryolarını çalıştır ve logları ekle.

---

### S2-03 - GitHub Actions servis matrisi

- Title: `S2-03 | Add services-affected GitHub Actions matrix`
- Labels: `sprint/s2`, `priority/p0`, `type/devops`, `area/pipeline`
- Estimate: `1d`
- Owner: `DevOps`
- Dependencies: `S2-02`

#### Acceptance Criteria

- [ ] PR'da etkilenen servis listesi otomatik üretiliyor.
- [ ] Matrix boş olduğunda workflow güvenli şekilde skip ediyor.
- [ ] Workflow örnek çıktıları issue'ya eklendi.

#### Technical Tasks

- [ ] `services-affected` job'unu ekle.
- [ ] Matrix output'unu downstream job'lara bağla.
- [ ] Skip/fail davranışını test et.

---

### S2-04 - Servis bazlı build/test/push

- Title: `S2-04 | Run build/lint/typecheck/test/push per affected service`
- Labels: `sprint/s2`, `priority/p0`, `type/devops`, `area/pipeline`
- Estimate: `1d`
- Owner: `DevOps`
- Dependencies: `S2-03`

#### Acceptance Criteria

- [ ] Her etkilenen servis için lint/typecheck/test/build/push çalışıyor.
- [ ] Başarısız servis diğerlerinden izole raporlanıyor.
- [ ] CI logları issue'ya eklendi.

#### Technical Tasks

- [ ] Matrix job'larına kalite adımlarını bağla.
- [ ] Push adımını branch/tag kurallarıyla sınırla.
- [ ] Hata raporlamasını sadeleştir.

---

### S2-05 - Deploy sırası enforce

- Title: `S2-05 | Enforce deploy order auth -> metadata -> support -> finance`
- Labels: `sprint/s2`, `priority/p0`, `type/devops`, `area/pipeline`
- Estimate: `1d`
- Owner: `DevOps`
- Dependencies: `S2-04`, `S1-11`

#### Acceptance Criteria

- [ ] Deploy sırası `auth -> metadata -> support -> finance` olarak enforce ediliyor.
- [ ] Bir önceki adım başarısızsa sonraki servis deploy edilmiyor.
- [ ] En az bir dry-run çıktısı issue'ya eklendi.

#### Technical Tasks

- [ ] Deploy workflow'u sıra bağımlı hale getir.
- [ ] On-failure stop kuralını ekle.
- [ ] Sıra doğrulama dry-run testini kaydet.

---

### S2-06 - Migration ownership + rollout gate

- Title: `S2-06 | Attach migration ownership and pre-check gates to pipeline`
- Labels: `sprint/s2`, `priority/p0`, `type/chore`, `area/pipeline`
- Estimate: `1d`
- Owner: `Backend Lead`
- Dependencies: `S2-05`

#### Acceptance Criteria

- [ ] Migration pre-check fail olduğunda deploy duruyor.
- [ ] Ownership tablosu ile migration adımı eşleşiyor.
- [ ] Cutover/runbook referansları issue'ya eklendi.

#### Technical Tasks

- [ ] Migration pre-check adımını workflow'a bağla.
- [ ] Ownership doğrulamasını script/policy ile enforce et.
- [ ] İlgili runbook linklerini güncelle.

---

### S2-07 - Endpoint bazlı routing cutover

- Title: `S2-07 | Add endpoint-based routing to new service units`
- Labels: `sprint/s2`, `priority/p0`, `type/feature`, `area/pipeline`
- Estimate: `1.5d`
- Owner: `Backend + DevOps`
- Dependencies: `S2-05`, `S1-07b`

#### Acceptance Criteria

- [ ] Belirlenen endpoint grupları yeni servislere yönleniyor.
- [ ] Canary/kademeli geçiş oranı uygulanabiliyor.
- [ ] Routing sonrası smoke sonuçları issue'ya eklendi.

#### Technical Tasks

- [ ] Reverse proxy/gateway route kurallarını ekle.
- [ ] Kademeli rollout parametrelerini tanımla.
- [ ] Routing sonrası smoke suite çalıştır.

---

### S2-08 - Tek servis rollback otomasyonu

- Title: `S2-08 | Script and verify single-service rollback`
- Labels: `sprint/s2`, `priority/p0`, `type/devops`, `area/pipeline`
- Estimate: `0.5d`
- Owner: `DevOps`
- Dependencies: `S2-05`

#### Acceptance Criteria

- [ ] Tek servis rollback script/komutu hazır.
- [ ] Rollback süresi ve adımları ölçülüp issue'ya yazıldı.
- [ ] Rollback sonrası health + smoke doğrulandı.

#### Technical Tasks

- [ ] Rollback script/komutunu ekle.
- [ ] Finance veya support için prova al.
- [ ] Sonuçları runbook ile eşleştir.

---

### S2-09 - Operasyon runbook güncellemesi

- Title: `S2-09 | Update cutover/smoke/rollback operational runbook`
- Labels: `sprint/s2`, `priority/p1`, `type/chore`, `area/pipeline`
- Estimate: `0.5d`
- Owner: `Backend Lead`
- Dependencies: `S2-06`, `S2-08`

#### Acceptance Criteria

- [ ] Cutover, smoke, rollback adımları güncel.
- [ ] Yeni deploy sırası ve runtime bağımlılık notu eklendi.
- [ ] Uygulanabilirlik review onayı issue'ya eklendi.

#### Technical Tasks

- [ ] Runbook dokümanını güncelle.
- [ ] Yeni workflow/link referanslarını ekle.
- [ ] Review çıktısını issue'ya bağla.

---

### S2-10 - Kritik E2E operasyon doğrulama

- Title: `S2-10 | Validate critical E2E flows on routed multi-service setup`
- Labels: `sprint/s2`, `priority/p0`, `type/test`, `area/finance`
- Estimate: `1d`
- Owner: `QA + Backend`
- Dependencies: `S2-07`, `S2-08`

#### Acceptance Criteria

- [ ] `dues generate`, `manual collection`, `checkout webhook`, `unit statement` akışları geçiyor.
- [ ] Webhook duplicate senaryosunda idempotency korunuyor.
- [ ] Ledger mutabakatı ve rollback sonrası tekrar doğrulama raporlandı.

#### Technical Tasks

- [ ] Kritik e2e senaryolarını koş.
- [ ] İdempotency ve mutabakat SQL/doğrulamaları ekle.
- [ ] Sonuçları issue ve sprint kapanış notuna yaz.

---

## QA Smoke Checklist (Copy-Paste)

### Core

- [ ] Tenant izolasyonu korunuyor (yanlış tenant erişimi engelleniyor)
- [ ] Hata formatı standart dönüyor
- [ ] Health endpointleri tüm servislerde yeşil

### Finance

- [ ] Dues generate -> CHARGE ledger yazıyor
- [ ] Manual collection -> PAYMENT ledger yazıyor
- [ ] Webhook duplicate -> ikinci finansal kayıt yok
- [ ] Unit statement toplamı beklentiyle uyumlu

### Metadata

- [ ] Site/unit/resident/occupancy CRUD akışları çalışıyor
- [ ] Primary responsible ataması doğru güncelleniyor

### Deployment

- [ ] Sadece etkilenen servis build edildi
- [ ] Deploy sırası doğru uygulandı
- [ ] Tek servis rollback doğrulandı

---

## PR Checklist Template (Copy-Paste)

```md
## Summary
- <what changed>

## Scope
- Sprint: S1 | S2
- Issue: S1-xx / S2-xx
- Service(s): <api-finance|api-metadata|api-support|api-auth>

## Acceptance Criteria
- [ ] AC-1
- [ ] AC-2
- [ ] AC-3

## Tests
- [ ] Unit
- [ ] Integration
- [ ] Smoke
- [ ] Manual (if needed)

## Risk
- Risk level: Low | Medium | High
- Rollback plan:

## Observability
- [ ] Logs checked
- [ ] Metrics/health checked

## Docs
- [ ] Related docs updated
```

---

## 2 Sprint Kapasite Planı (Öneri)

### Takım

- 1 Backend Lead
- 2 Backend Engineer
- 1 DevOps Engineer
- 1 QA (part-time)

### Kapasite (gün)

| Rol | Sprint 1 | Sprint 2 | Not |
|---|---:|---:|---|
| Backend Lead | 3.0 | 2.5 | boundary, contract, migration ownership |
| Backend Engineer A | 6.0 | 4.0 | finance taşıma + test |
| Backend Engineer B | 6.0 | 3.5 | metadata taşıma + routing destek |
| DevOps Engineer | 2.5 | 6.0 | docker, ci/cd, deploy, rollback |
| QA | 1.5 | 2.5 | smoke + e2e doğrulama |

### Kritik Yol

1. S1-01 -> S1-02 -> S1-03 -> S1-04 -> S1-07a -> S1-07b -> S1-05/S1-06 -> S1-10
2. S1-11 -> S2-05 -> S2-07
3. S2-01 -> S2-02 -> S2-03 -> S2-04 -> S2-05 -> S2-07 -> S2-08 -> S2-10

### Sprint Başlangıç Kuralı

- Sprint 2 başlamadan Sprint 1 smoke raporu ve blocker listesi onaylanmalıdır.
