# 10 — Gelistirme Kilavuzu

> Ilgili dokumanlar: 01-MIMARI-GENEL-BAKIS, 05-API-TASARIMI

---

## On Gereksinimler

- Node.js >= 20
- pnpm >= 9
- PostgreSQL (yerel veya managed)
- Firebase projesi (auth icin)

---

## Kurulum

```bash
git clone <repo-url>
cd sakin
pnpm install               # Tum bagimliliklari yukle

# Ortam degiskenleri
cp api/.env.example api/.env
cp client/admin/.env.example client/admin/.env.local
cp packages/database/.env.example packages/database/.env
# → Degerleri doldurun (DB URL, Firebase config, iyzico key)

pnpm db:generate            # Prisma client olustur
pnpm db:migrate:dev         # Migration calistir
pnpm db:seed                # Demo veri yukle

pnpm dev                    # Tum uygulamalari paralel baslat
```

Tek uygulama baslatmak icin:
```bash
pnpm --filter=@sakin/api dev        # API → localhost:3001
pnpm --filter=@sakin/admin dev      # Admin → localhost:3000
pnpm --filter=@sakin/mobile dev     # Mobile → Expo dev server
```

---

## Monorepo Komutlari

| Komut | Ne Yapar |
|-------|----------|
| `pnpm dev` | Tum uygulamalar paralel |
| `pnpm dev:web` | API + Admin (mobil haric) |
| `pnpm build` | Tum paketleri build et |
| `pnpm typecheck` | TypeScript tip kontrolu |
| `pnpm lint` | Lint kontrolu |
| `pnpm db:generate` | Prisma client olustur |
| `pnpm db:migrate:dev` | Yeni migration olustur |
| `pnpm db:studio` | Prisma Studio (DB UI) |
| `pnpm db:seed` | Demo veri yukle |

Filtreleme: `pnpm --filter=@sakin/api <komut>` ile tek paket hedeflenebilir.

---

## Yeni API Modulu Ekleme

1. `api/src/modules/<modul>/` klasoru olustur
2. `<modul>.module.ts` — NestJS module tanimla
3. `<modul>.controller.ts` — endpoint'leri tanimla, `@Roles()` decorator ekle
4. `<modul>.service.ts` — is mantigi
5. Prisma model gerekiyorsa:
   - `packages/database/prisma/schema.prisma`'ya model ekle
   - Tenant-scoped ise `tenantId` kolonu + `PrismaService`'teki listeye ekle
   - `pnpm db:migrate:dev` ile migration olustur
6. `packages/shared/src/`'a:
   - Zod sema ekle
   - Gerekli enum ekle
   - Tip export et
7. `api/src/app.module.ts`'ye import et
8. `doc/role-access-policy.md`'yi guncelle

---

## Yeni Frontend Sayfasi Ekleme

### Admin Panel (Next.js App Router)
1. `client/admin/src/app/<route>/page.tsx` olustur
2. API client ile veri cek
3. Gerekli bilesentleri olustur
4. Sidebar navigation'a ekle
5. Rol kontrolu: bu sayfa STAFF gorebilir mi? → Navigation'da kosullu goster

### Mobil Uygulama (Expo Router)
1. `client/mobile/app/<route>.tsx` veya `client/mobile/app/(tabs)/<tab>.tsx` olustur
2. API client ile veri cek
3. React Native bilesentleri kullan

---

## Deploy

| Bilesen | Platform | Nasil |
|---------|----------|-------|
| API | Render | Git push → otomatik build → `pnpm --filter=@sakin/api build` → `node dist/main.js` |
| Admin | Vercel | Git push → otomatik build → Next.js native |
| Platform | Vercel | Ayni — farkli proje olarak tanimla |
| Mobile | EAS Build | `eas build` → App Store / Play Store |
| Database | Managed PostgreSQL | Render veya ayri provider |

### Deploy Oncesi Checklist
- [ ] `pnpm typecheck` sifir hata
- [ ] `pnpm build` basarili
- [ ] Ortam degiskenleri production degerlerle dolu
- [ ] Prisma migration production DB'ye uygulanmis
- [ ] Firebase production projesi ayarli

---

## Sik Karsilasilan Sorunlar

### `Cannot find module '@sakin/database'`
Prisma client olusturulmamis. `pnpm db:generate` calistir.

### `Cannot find type definition file for 'node'`
`node_modules` bozulmus olabilir. `rm -rf node_modules && pnpm install` dene.

### API baslatilinca "Firebase app not initialized"
`.env` dosyasinda Firebase credential'lari eksik veya yanlis.

### Admin panel "auth/invalid-api-key"
`client/admin/.env.local` dosyasinda Firebase config eksik.

### iyzico webhook calismyor (local)
iyzico webhook'u localhost'a ulasam. Gelistirmede:
- `ngrok` veya benzer tool ile tunnel ac
- iyzico sandbox ayarlarindan webhook URL'ini guncelle

---

## Kod Konvansiyonlari

- **Dil:** Kod ve degiskenler Ingilizce, kullaniciya gosterilen mesajlar Turkce
- **Validasyon:** Her zaman Zod sema kullan, elle kontrol yapma
- **Import:** `@sakin/*` workspace referanslari kullan, relative path degil
- **Hata:** NestJS `HttpException` hierarchy kullan, generic `Error` firlatma
- **Loglama:** Kritik islemlerde (odeme, silme) mutlaka logla
- **Yorum:** Sadece karmasik is mantigi icin — bariz olan seyi yorumlama
