# Tenant Rolu UI - 2 Sprint Uygulanabilir Backlog

Bu dokuman, TENANT_ADMIN arayuzunde planlanan isleri 2 sprintte uygulanabilir backlog olarak toplar.

Issue-ready surum icin: [TENANT-ROLE-UI-ISSUE-KIT.md](TENANT-ROLE-UI-ISSUE-KIT.md)

## Kapsam

- Rol hedefi: TENANT_ADMIN
- Uygulama: admin panel
- Odak: operasyon yerine yonetsel kontrol, denetim ve toplu yonetim

## Kapsam Disi

- STAFF operasyon ekranlarinin yeniden tasarimi
- Mobile resident arayuzu
- API domain ayrisma calismalari

## Mevcut Durum Ozeti

- Operasyonel akis agirlikla work ekranlarinda aktif.
- Tenant-admin ana sayfalari icin genisletme notlari mevcut: residents, dues, payments, sites.

## Rol Kapsam Sozlesmesi (Net)

Bu backlog, `doc/role-access-policy.md` ile uyumlu tek rol sozlesmesini kullanir:

- `TENANT_ADMIN`:
  - Yonetim + operasyon ekranlari.
  - Hedef route kapsam: `/dashboard`, `/sites`, `/dues`, `/reports`, `/settings`, `/residents`, `/payments`, `/work/*`.
  - Policy/degisiklik yapabilen rol (site/dues/settings/report governance).
- `STAFF`:
  - Operasyon odakli ekranlar.
  - Hedef route kapsam: `/residents`, `/payments`, `/work/*`.
  - Governance/policy ekranlarina erisemez (`/dashboard`, `/sites`, `/dues`, `/reports`, `/settings`).
- `SUPER_ADMIN`:
  - `apps/admin` kapsam disi; `apps/platform` yonlendirme davranisi korunur.

Bu dokumandaki tum maddeler icin zorunlu kural:
- `TENANT_ADMIN` yetkisi genislerken `STAFF` davranisi geri bozulma yasamamalidir.
- Route/API erisim degisiklikleri `role-access-policy` ile birlikte guncellenmelidir.

## Lineer Uygulama Sirasi (Karar Tam)

Bu backlog tek hat/lineer yurutulecektir:

1. `T1-01` Residents bulk management + import/export
2. `T1-02` Dues policy + period governance
3. `T1-03` Payments audit + reconciliation
4. `T1-04` Tenant-admin dashboard executive expansion
5. `T1-05` Sprint-1 smoke + blocker report
6. `T2-01` Sites module completion (CRUD + status cards)
7. `T2-02` Reports presets + saved filters
8. `T2-03` Work communications (real screen)
9. `T2-04` Work residents/payments split pages
10. `T2-05` Work topbar placeholder actions completion
11. `T2-06` Tenant E2E regression + release notes

---

## Sprint 1 (2 Hafta)

### Sprint Hedefi

- Tenant-admin icin P0 yonetsel eksikleri kapatmak.
- Toplu veri yonetimi, politika yonetimi ve denetim gorunumunu urune almak.

### Backlog (Sprint 1)

| ID | Is | Oncelik | Sorumlu | Tahmin | Bagimlilik | Kabul Kriteri |
|---|---|---|---|---|---|---|
| T1-01 | Residents toplu yonetim ve import/export | P0 | Frontend + Backend | 2g | - | CSV import preview+commit, CSV export, toplu guncelleme, hata raporu |
| T1-02 | Dues politika ve donem yonetimi | P0 | Frontend + Backend | 2g | T1-01 | Site bazli varsayilan aidat, donem ac/kapat, vade/politika ayari, waive onay akisi |
| T1-03 | Payments denetim ve mutabakat gorunumu | P0 | Frontend + Backend | 2g | T1-02 | Gunluk/aylik mutabakat, yontem dagilimi, supheli islemler, makbuz/iz export |
| T1-04 | Tenant dashboard yonetsel kartlari | P1 | Frontend | 1g | T1-03 | Portfoy risk, top borclu listesi, trend kartlari, aksiyon onerileri |
| T1-05 | Sprint 1 tenant smoke raporu | P0 | QA + Frontend | 0.5g | T1-01,T1-02,T1-03 | Kritik tenant akislar test edildi, blocker listesi cikarildi |

### Sprint 1 Definition of Done

- Residents, Dues, Payments sayfalarinda tenant-admin odakli genisletmeler aktif.
- Rol erisim politikalari korunuyor.
- Tenant context bozulmadan tum akislar calisiyor.
- Smoke raporu dokumante edildi.
- TENANT_ADMIN vs STAFF ekran/aksiyon ayrimi route ve API seviyesinde kanitlandi.

### Sprint 1 Riskler

- Buyuk CSV importlarda hata yonetimi
- Mutabakat metriklerinde performans

### Sprint 1 Risk Azaltimi

- Import dry-run zorunlulugu
- Rapor sorgularinda sayfalama ve tarih filtresi zorunlulugu

---

## Sprint 2 (2 Hafta)

### Sprint Hedefi

- Tenant-admin arayuzunde P1/P2 kapsamini tamamlamak.
- Work altinda placeholder kalan alanlari fonksiyonel hale getirmek.

### Backlog (Sprint 2)

| ID | Is | Oncelik | Sorumlu | Tahmin | Bagimlilik | Kabul Kriteri |
|---|---|---|---|---|---|---|
| T2-01 | Sites modulu tamamlama (CRUD + durum kartlari) | P1 | Frontend + Backend | 1.5g | T1-05 | Site ekle/duzenle/arsivle, bloklu/bloksuz destek, operasyon durumu kartlari |
| T2-02 | Reports preset paketleri ve filtre kaydetme | P1 | Frontend + Backend | 1.5g | T1-03 | Hazir rapor setleri, kayitli filtreler, zamanlanmis export kayitlari |
| T2-03 | Work communications modulu (redirect yerine gercek ekran) | P2 | Frontend + Backend | 1g | T2-02 | Template mesaj, hedef kitle secimi, gonderim gecmisi |
| T2-04 | Work residents/payments ayrik sayfalar | P2 | Frontend | 1g | T2-03 | Ayrik route, deep-link filtre, nav uyumu |
| T2-05 | Work topbar placeholder aksiyonlarini tamamlama | P2 | Frontend | 0.5g | T2-04 | Bildirim merkezi, yardim paneli, profil menusu aktif |
| T2-06 | Tenant e2e regresyon + release notu | P0 | QA + Frontend | 0.5g | T2-01,T2-02,T2-03,T2-04,T2-05 | Tenant-admin kritik akislari e2e geciyor, release notu yayinda |

### Sprint 2 Definition of Done

- Sites ve Reports tenant-admin icin urun seviyesinde tamamlandi.
- Work altinda redirect olan alanlar fonksiyonel.
- Placeholder aksiyonlar minimum islevsellikte aktif.
- E2E regresyon ve release notu tamam.
- Rol sozlesmesi (`TENANT_ADMIN` governance, `STAFF` operasyon) tum yeni ekranlarda korunuyor.

### Sprint 2 Riskler

- Work route ayrismasinda state dagilimi
- Reports tarafinda uzun suren export akislari

### Sprint 2 Risk Azaltimi

- Shared query helper kullanimi
- Uzun sureli export icin async durum gostergesi

---

## Bagimlilik Haritasi

- Sprint 1 tamamlanmadan Sprint 2 baslatilmaz.
- T1-03 mutabakat gorunumu tamamlanmadan Reports kapsaminda release alinmaz.
- T2-03 aktif olmadan communication ile ilgili hatirlatma akislari product-ready sayilmaz.

## Gecis Kapilari ve Issue Kapanis Kurali

- `Kapi-1 (T1 -> T2)`:
  - `T1-05` smoke kaniti + blocker listesi tamamlanmadan Sprint 2 issue'lari acik olsa da implementasyona alinmaz.
- `Kapi-2 (T2 -> Release)`:
  - `T2-06` e2e regresyon ve release notu tamamlanmadan release adimina gecilmez.

Her issue kapanisinda minimum dogrulama zorunludur:
- Route guard kontrolu (`TENANT_ADMIN` vs `STAFF`)
- Tenant context dogrulamasi
- Ilgili sayfada empty/error state dogrulamasi

## Olcum Metrikleri

- Tenant-admin ekran gorev tamamlama suresi
- Residents import hata orani
- Mutabakat ekrani acilis suresi
- Export basari orani
- Tenant rolunde change failure rate

## Sprint Sonu Demo Senaryolari

1. Residents import dry-run ve commit akisi
2. Dues politika degisikligi ile yeni donem etkisi
3. Payments mutabakat ozetinden supheli isleme inis
4. Sites ekranindan aktif site durumuna gecis
5. Work communications uzerinden hedefli mesaj gonderimi
