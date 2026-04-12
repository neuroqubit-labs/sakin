# S1-11 API-Auth Tenant Context Strategy ADR

- Status: `Accepted`
- Date: `2026-04-09`
- Scope: `S1-11 | Lock api-auth tenant-context validation strategy`

## Context

Sprint 1 sonunda `api-auth`, `api-finance`, `api-metadata`, `api-support` shell yapilari olustu. Tenant context dogrulamasinin tek bir stratejiye kilitlenmesi gerekiyor; aksi halde Sprint 2 routing/deploy asamasinda tutarsiz davranis riski olusuyor.

Degerlendirilen secenekler:

1. Shared middleware stratejisi (`@sakin/api-core` TenantMiddleware)
2. Auth service introspection stratejisi (her istekte auth servise remote tenant validation)

## Decision

Sprint 2 cutover asamasina kadar tek strateji olarak `shared middleware` secildi.

`api-auth` dahil tum servislerde tenant context dogrulamasi `@sakin/api-core` icindeki ayni middleware davranisi ile calisacak. Auth introspection stratejisi bu fazda zorunlu degil; gerekirse Sprint 3+ icin ayrica ADR acilacak.

## Rationale

- Mevcut kod tabaniyla en dusuk migration riski.
- Servisler arasi ekstra runtime bagimliligi olusturmadan tutarli davranis.
- Sprint 2 deploy sirasi (`auth -> metadata -> support -> finance`) ile uyumlu; auth outage durumunda diger servislerin local tenant parse davranisi bozulmuyor.

## Acceptance Criteria Mapping

- Tek strateji secildi: `shared middleware`.
- Migration etkisi net:
  - Yeni servisler ayni middleware davranisini reuse eder.
  - Endpoint-level introspection mecburiyeti olmadigi icin latency/runtime coupling artmaz.
- Ekip onayi notu:
  - Bu ADR, Sprint 2 pipeline/routing issue'larina referans olarak baglanacak (`S2-05`, `S2-07`).

## Consequences

- Kisa vade: daha hizli ve dusuk riskli cutover.
- Orta vade: merkezi policy/introspection ihtiyaci artarsa yeni ADR ile kademeli gecis planlanmali.
