# Service Deploy Dönüşümü — 2 Sprint Uygulanabilir Backlog

Bu doküman, tek repo yapısını koruyarak API tarafını bağımsız deploy birimlerine ayırma hedefi için 2 sprintlik uygulanabilir planı içerir.

Issue-ready şablonlar, PR checklist ve kapasite planı için ek doküman: [SERVICE-DEPLOY-2-SPRINT-ISSUE-KIT.md](SERVICE-DEPLOY-2-SPRINT-ISSUE-KIT.md)

Tenant-admin arayüz backlog ve issue-ready seti: [TENANT-ROLE-UI-2-SPRINT-BACKLOG.md](TENANT-ROLE-UI-2-SPRINT-BACKLOG.md), [TENANT-ROLE-UI-ISSUE-KIT.md](TENANT-ROLE-UI-ISSUE-KIT.md)

## Kapsam

- Monorepo korunur.
- Public API sözleşmeleri mümkün olduğunca korunur.
- İlk aşamada tek PostgreSQL ve mevcut Prisma şeması korunur.
- Hedef: bağımsız deploy birimleri ve servis bazlı pipeline.

## Kapsam Dışı

- Veritabanını servis başına fiziksel olarak ayırma.
- Event-driven tam ayrışma (outbox ve broker genişletmesi Faz 3+).
- Frontend uygulamalarında büyük endpoint refactor.

## Hedef Servis Sınırları

- `api-finance`: dues, payment, ledger, export
- `api-metadata`: site, block, unit, resident, occupancy
- `api-support`: notification, announcement, expense
- `api-auth`: auth/token doğrulama + tenant context

## Varsayımlar

- Ekip en az 1 backend lead, 2 backend engineer, 1 devops engineer kapasitesiyle çalışır.
- Her sprint 2 hafta olarak planlanır.
- CI altyapısı GitHub Actions üzerinde çalışır.

## Rollout Stratejisi

1. Önce sınırları yazılı hale getir.
2. Yeni servis entrypointlerini paralel aç.
3. Domain modüllerini kademeli taşı.
4. CI/CD'yi affected-only çalışacak şekilde ayır.
5. Trafiği endpoint grupları bazında kontrollü taşı.

---

## Sprint 1 (2 Hafta)

### Sprint Hedefi

- Servis sınırlarını dondurmak.
- Çoklu API deploy birimi iskeletini açmak.
- Ortak güvenlik/tenant davranışını servisler arasında standardize etmek.
- Monolit API'yi bozmadan paralel çalışma altyapısı kurmak.

### Çıktılar

- Yeni servis klasörleri ve çalışma komutları hazır.
- `api-finance` ve `api-metadata` uygulamaları ayağa kalkabiliyor.
- Ortak middleware/guard/response katmanı paylaştırılmış.
- Dokümante edilmiş ownership ve import kuralları.

### Backlog (Sprint 1)

| ID | İş | Öncelik | Sorumlu | Tahmin | Bağımlılık | Kabul Kriteri |
|---|---|---|---|---|---|---|
| S1-01 | Servis sınırları ve tablo ownership dokümanı oluştur | P0 | Backend Lead | 0.5g | - | Doküman repo içinde, ownership net ve onaylı |
| S1-02 | Workspace'e yeni servis app'lerini ekle (`api-finance`, `api-metadata`, `api-support`, `api-auth`) | P0 | Backend | 1g | S1-01 | Her app için `dev`, `build`, `typecheck` komutları çalışır |
| S1-03 | Her servis için minimal Nest app bootstrap (`main.ts`, `app.module.ts`) oluştur | P0 | Backend | 1g | S1-02 | Servisler bağımsız portlarda ayağa kalkar ve `/health` endpoint döner |
| S1-04 | Ortak altyapı katmanı çıkar: tenant middleware, roles guard, exception/transform interceptor | P0 | Backend | 1.5g | S1-02 | Yeni servislerde aynı davranış ve response formatı korunur |
| S1-07a | Minimum internal HTTP sözleşmesi setini tasarla (sync v1) | P0 | Backend Lead | 0.5g | S1-03, S1-04 | Endpoint listesi, request/response örnekleri ve timeout/retry/error standardı net |
| S1-07b | `finance-support` sync contract + adapter uygula (payment -> notification) | P0 | Backend | 1g | S1-07a | Payment akışında support çağrısı internal contract üzerinden çalışır ve smoke testte doğrulanır |
| S1-05 | `api-finance` içine `dues/payment/ledger/export` modüllerini taşı (ilk pass) | P0 | Backend | 2g | S1-03, S1-04, S1-07b | Modüller compile eder, smoke endpoint testleri geçer |
| S1-06 | `api-metadata` içine `site/block/unit/resident/occupancy` modüllerini taşı (ilk pass) | P0 | Backend | 2g | S1-03, S1-04, S1-07a | Modüller compile eder, smoke endpoint testleri geçer |
| S1-08 | Import guard kuralı: modüller arası doğrudan çapraz import yasağı (lint/konvansiyon) | P1 | Backend | 0.5g | S1-02, S1-05, S1-06 | Kural dokümante, CI'da fail-fast çalışıyor ve ilk taşıma PR'larında ihlal bloklanıyor |
| S1-09 | Çoklu servis local compose/dev komutu hazırla | P1 | DevOps | 1g | S1-02, S1-03 | Tek komutla birden çok servis ayağa kalkıyor |
| S1-10 | Sprint 1 smoke test checklist ve sonuç raporu | P0 | QA+Backend | 0.5g | S1-05, S1-06, S1-09 | Kritik akışlar (`dues -> payment -> ledger` + notification side-effect, metadata CRUD + occupancy, tüm yeni servislerde `/health`) raporlanmış |
| S1-11 | `api-auth` tenant context doğrulama stratejisini kilitle (shared middleware vs auth introspection) | P0 | Backend Lead | 0.5g | S1-04 | Tek strateji ADR ile seçilmiş, kabul kriterleri ve migration etkisi net, ekip onayı alınmış |

### Sprint 1 Definition of Done

- `api-finance` ve `api-metadata` bağımsız çalışıyor.
- Tenant izolasyonu davranışı korunuyor.
- Response/hata formatı servislerde aynı.
- Tüm yeni servis bootstrap'lerinde `/health` endpoint'i zorunlu ve yeşil.
- `payment -> notification` akışı doğrudan cross-import yerine tanımlı internal contract + adapter ile çalışıyor.
- Eski monolit app çalışmaya devam ediyor (rollback hazır).
- Smoke test raporu dokümante edildi.

### Sprint 1 Riskler

- Taşınan modüllerde gizli cross-module bağımlılık.
- Internal HTTP geçişinde timeout ve hata yönetimi eksikliği.

### Sprint 1 Risk Azaltımı

- Her taşıma adımında compile + smoke test.
- Internal çağrılarda timeout/retry standardını ilk sprintte belirleme.

---

## Sprint 2 (2 Hafta)

### Sprint Hedefi

- CI/CD'yi servis bazlı deploy edecek hale getirmek.
- Affected-only build/deploy matrisini devreye almak.
- Trafiği kontrollü olarak yeni servislere yönlendirmek.
- Rollback ve runbook süreçlerini operasyonel hale getirmek.

### Çıktılar

- Servis bazlı Docker image üretimi.
- GitHub Actions üzerinden etkilenen servis kadar build/test/deploy.
- Deploy sırası ve migration adımları dokümante.
- Kademeli trafik geçişi ve rollback kanıtı.

### Backlog (Sprint 2)

| ID | İş | Öncelik | Sorumlu | Tahmin | Bağımlılık | Kabul Kriteri |
|---|---|---|---|---|---|---|
| S2-01 | Servis bazlı Dockerfile'lar oluştur ve image tagging standardı tanımla | P0 | DevOps | 1.5g | Sprint 1 tamam | Her servis image'ı build edilir ve etiketlenir |
| S2-02 | Turbo görevlerini servis bazlı çalışacak şekilde güncelle (affected-only) | P0 | Backend+DevOps | 1g | S2-01 | Değişen servis dışı gereksiz build tetiklenmiyor |
| S2-03 | GitHub Actions servis matrisi workflow'u ekle (`services-affected`) | P0 | DevOps | 1g | S2-02 | PR'da etkilenen servis listesi üretiliyor |
| S2-04 | Build/test/push workflow'u servis bazında çalıştır | P0 | DevOps | 1g | S2-03 | Her etkilenen servis için lint/typecheck/test/build/push tamam |
| S2-05 | Deploy workflow ve sıra kuralını ekle (`auth -> metadata -> support -> finance`) | P0 | DevOps | 1g | S2-04 | Deploy sırası enforce ediliyor |
| S2-06 | Migration ownership ve rollout adımını pipeline'a bağla | P0 | Backend Lead | 1g | S2-05 | Migration pre-check fail olursa deploy durur |
| S2-07 | Reverse proxy veya gateway routing kuralı ile endpoint bazlı trafik yönlendir | P0 | Backend+DevOps | 1.5g | S2-05 | Belirlenen endpoint grupları yeni servise yönlenir |
| S2-08 | Geri dönüş (rollback) prosedürünü otomatik/scriptlenmiş hale getir | P0 | DevOps | 0.5g | S2-05 | Tek servis rollback adımı doğrulanmış |
| S2-09 | Operasyon runbook'u güncelle (cutover, smoke, rollback) | P1 | Backend Lead | 0.5g | S2-06, S2-08 | Runbook güncel ve uygulanabilir |
| S2-10 | E2E kritik akış doğrulama: dues generate, manual collection, checkout webhook, unit statement | P0 | QA+Backend | 1g | S2-07 | Tüm kritik akışlar yeni yönlendirmede geçiyor |

### Sprint 2 Definition of Done

- Her servis ayrı image olarak üretilebilir ve deploy edilebilir.
- CI/CD sadece etkilenen servisleri çalıştırır.
- Trafik yönlendirmesi kontrollü aktif edilir ve ölçülür.
- Rollback prosedürü kanıtlanır.
- Kritik finansal akışlar yeni yapıda doğrulanır.

### Sprint 2 Riskler

- Pipeline karmaşıklığının ilk kurulumda kırılgan olması.
- Yanlış routing nedeniyle kısmi endpoint kesintisi.

### Sprint 2 Risk Azaltımı

- Canary tarzı kademeli yönlendirme.
- Her routing değişikliği sonrası smoke suite.
- Tek servis rollback komutu hazır tutulur.

---

## Sprintler Arası Bağımlılık Haritası

- Sprint 1 tamamlanmadan Sprint 2 deploy otomasyonu başlatılmaz.
- Routing geçişi, servis smoke testleri ve health sinyalleri olmadan açılmaz.
- Finance akışlarında idempotency doğrulanmadan trafik taşınmaz.
- Runtime bağımlılığı nedeniyle `support` servisi hazır olmadan `finance` routing aktif edilmez.

## Ölçüm Metrikleri

- Build süresi (hedef: affected-only sonrası %30+ iyileşme)
- Deploy süresi (servis başına)
- Lead time for change
- Change failure rate
- Rollback süresi
- Finance endpoint hata oranı

## Sprint Sonu Demo Senaryoları

1. Sadece `payment` modülünde değişiklik yapıldığında sadece `api-finance` pipeline'ı tetiklenir.
2. `api-finance` yeni image deploy edilirken diğer servisler etkilenmez.
3. `dues -> payment -> ledger` akışı canlı smoke testte geçer ve notification side-effect doğrulanır.
4. Hata simülasyonunda `api-finance` bir önceki tag'e geri alınır.

## Sonraki Faz (Sprint 3+ Öneri)

- Internal HTTP + outbox hibritine geçiş.
- Contract test otomasyonu (consumer-driven).
- Gözlemlenebilirlik standardı (trace + metric + centralized log).
- Opsiyonel olarak servis başına DB schema ayrıştırma.
