# Tenant Rolu UI - Issue Kit

Bu dokuman, [TENANT-ROLE-UI-2-SPRINT-BACKLOG.md](TENANT-ROLE-UI-2-SPRINT-BACKLOG.md) icindeki maddeleri issue-ready formata cevirir.

## Etiket Standardi

- `sprint/tenant-s1` `sprint/tenant-s2`
- `priority/p0` `priority/p1` `priority/p2`
- `type/feature` `type/chore` `type/test`
- `area/tenant-admin` `area/reports` `area/sites` `area/workspace`

## Rol Kapsam Referansi (Zorunlu)

Tum issue'lar asagidaki rol sozlesmesine gore acilir ve test edilir:

- `TENANT_ADMIN`: `/dashboard`, `/sites`, `/dues`, `/reports`, `/settings`, `/residents`, `/payments`, `/work/*`
- `STAFF`: `/residents`, `/payments`, `/work/*`
- `SUPER_ADMIN`: `apps/admin` yerine `apps/platform`

Referans dokuman: `doc/role-access-policy.md`

Uygulama baslangic paketi (S1 P0 lineer akis): `doc/TENANT-ROLE-UI-S1-P0-EXECUTION-PACK.md`
Sprint-1 smoke raporu: `doc/T1-05-TENANT-SMOKE-BLOCKER-REPORT.md`
Sprint-2 e2e + release notu: `doc/T2-06-TENANT-E2E-REGRESSION-RELEASE-NOTES.md`

## Lineer Issue Acilis ve Uygulama Sirasi

Bu kit, tek hat/lineer yurutme varsayimiyla uygulanir:

1. `T1-01`
2. `T1-02`
3. `T1-03`
4. `T1-04`
5. `T1-05`
6. `T2-01`
7. `T2-02`
8. `T2-03`
9. `T2-04`
10. `T2-05`
11. `T2-06`

Gecis kapilari:
- `Kapi-1 (T1 -> T2)`: `T1-05` smoke + blocker raporu olmadan T2 implementasyonu baslamaz.
- `Kapi-2 (T2 -> Release)`: `T2-06` e2e regresyon + release notu olmadan release adimina gecilmez.

Her issue kapanisinda minimum kontrol:
- Route guard (`TENANT_ADMIN` vs `STAFF`)
- Tenant context
- Empty/error state

## Sprint 1 Issue Sablonlari

### T1-01 - Residents toplu yonetim + import/export

- Title: `T1-01 | Residents bulk management and import-export`
- Labels: `sprint/tenant-s1`, `priority/p0`, `type/feature`, `area/tenant-admin`
- Estimate: `2d`
- Owner: `Frontend + Backend`
- Dependencies: `-`

#### Description

Tenant-admin icin residents ekranini toplu yonetim seviyesine cikart.

#### Acceptance Criteria

- [ ] CSV import dry-run + preview + commit var.
- [ ] CSV export filtreli calisiyor.
- [ ] Toplu guncelleme (aktif/pasif, iletisim alanlari) var.
- [ ] Hata satirlari detay raporlanıyor.
- [ ] STAFF rolunde unauthorized governance aksiyonlari acilmiyor (regression yok).

#### Technical Tasks

- [ ] Import parser + validate katmani
- [ ] Preview UI ve satir bazli hata gosterimi
- [ ] Export endpoint ve UI baglantisi
- [ ] Toplu update endpointi + action bar

---

### T1-02 - Dues politika ve donem yonetimi

- Title: `T1-02 | Dues policy and period governance for tenant-admin`
- Labels: `sprint/tenant-s1`, `priority/p0`, `type/feature`, `area/tenant-admin`
- Estimate: `2d`
- Owner: `Frontend + Backend`
- Dependencies: `T1-01`

#### Acceptance Criteria

- [ ] Site bazli varsayilan aidat tanimi kaydedilebiliyor.
- [ ] Donem ac/kapat aksiyonlari var.
- [ ] Vade gunu ve temel politika ayarlari var.
- [ ] Waive/onay akis kurali tenant-admin panelinden yonetiliyor.
- [ ] STAFF kullanicisi bu policy aksiyonlarini goremiyor/cegiramiyor.

#### Technical Tasks

- [ ] Policy form + validation
- [ ] Donem kontrol endpoint entegrasyonu
- [ ] Waive/onay aksiyonlari
- [ ] Audit kaydi dogrulamasi

---

### T1-03 - Payments denetim + mutabakat

- Title: `T1-03 | Payments audit and reconciliation view`
- Labels: `sprint/tenant-s1`, `priority/p0`, `type/feature`, `area/tenant-admin`
- Estimate: `2d`
- Owner: `Frontend + Backend`
- Dependencies: `T1-02`

#### Acceptance Criteria

- [ ] Gunluk ve aylik mutabakat ozetleri var.
- [ ] Yontem bazli dagilim calisiyor.
- [ ] Supheli/bekleyen/duplicate listesi filtrelenebiliyor.
- [ ] Makbuz ve denetim izi export alinabiliyor.
- [ ] STAFF rolu read-operasyon sinirinda kaliyor; yonetsel policy degisikligi yapamiyor.

#### Technical Tasks

- [ ] Reconciliation summary widget
- [ ] Method/status breakdown chart
- [ ] Suspicious queue table
- [ ] Receipt/audit export aksiyonu

---

### T1-04 - Dashboard yonetsel genisleme

- Title: `T1-04 | Expand tenant-admin dashboard for executive decisions`
- Labels: `sprint/tenant-s1`, `priority/p1`, `type/feature`, `area/tenant-admin`
- Estimate: `1d`
- Owner: `Frontend`
- Dependencies: `T1-03`

#### Acceptance Criteria

- [ ] Portfoy risk kartlari var.
- [ ] Top borclu liste paneli var.
- [ ] Haftalik/aylik trend var.
- [ ] Aksiyon onerisi kartlari var.
- [ ] Dashboard route sadece TENANT_ADMIN icin erisilebilir kalir.

---

### T1-05 - Sprint 1 smoke raporu

- Title: `T1-05 | Tenant sprint-1 smoke and blocker report`
- Labels: `sprint/tenant-s1`, `priority/p0`, `type/test`, `area/tenant-admin`
- Estimate: `0.5d`
- Owner: `QA + Frontend`
- Dependencies: `T1-01`, `T1-02`, `T1-03`

#### Acceptance Criteria

- [ ] Residents import/export test edildi.
- [ ] Dues policy akislari test edildi.
- [ ] Payments mutabakat akislar test edildi.
- [ ] Blocker listesi issueya eklendi.
- [ ] TENANT_ADMIN/STAFF route ve aksiyon ayrimi smoke checklist ile dogrulandi.

---

## Sprint 2 Generic Issue Sablonu (T2-xx)

- Title: `T2-XX | <short action>`
- Labels: `sprint/tenant-s2`, `priority/p1|p2`, `type/feature|chore|test`, `area/sites|reports|workspace|tenant-admin`
- Estimate: `0.5d - 1.5d`
- Owner: `<role>`
- Dependencies: `<T1-.. or T2-..>`

#### Description

Tenant-admin arayuzundeki ilgili backlog maddesini urun seviyesinde tamamla.

#### Acceptance Criteria

- [ ] Backlog maddesindeki AC'ler birebir saglandi.
- [ ] Rol bazli erisim kurallari bozulmadi.
- [ ] Smoke/e2e kaniti issue'ya eklendi.

#### Technical Tasks

- [ ] UI degisiklikleri
- [ ] API entegrasyonu
- [ ] Testler
- [ ] Dokuman guncellemesi

---

## QA Smoke Checklist (Tenant)

- [ ] Tenant-admin route guard dogru calisiyor.
- [ ] Residents import dry-run ve commit dogru sonuc veriyor.
- [ ] Dues policy degisikligi sonraki donemde etkili.
- [ ] Payments mutabakat ozetleri tutarli.
- [ ] Reports export basariyla uretiliyor.
- [ ] Work communications route redirect degil gercek ekran.

## PR Checklist (Tenant)

```md
## Summary
- <what changed>

## Scope
- Sprint: tenant-s1 | tenant-s2
- Issue: T1-xx / T2-xx
- Role: TENANT_ADMIN

## Acceptance Criteria
- [ ] AC-1
- [ ] AC-2
- [ ] AC-3

## Tests
- [ ] Unit
- [ ] Integration
- [ ] Smoke
- [ ] E2E (if needed)

## Access Policy
- [ ] Tenant-admin access verified
- [ ] Staff behavior unchanged

## Risk & Rollback
- Risk level: Low | Medium | High
- Rollback plan:

## Docs
- [ ] Backlog/issue docs updated
```

## Acilis Sirasi Onerisi

1. T1-01
2. T1-02
3. T1-03
4. T1-04
5. T1-05
6. T2-01
7. T2-02
8. T2-03
9. T2-04
10. T2-05
11. T2-06 (release/e2e)
