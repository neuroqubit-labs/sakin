# S1-09 Local Multi-Service Run

Bu dokuman, `S1-09 | Add local multi-service run command` kapsamindaki local calistirma standardini kaydeder.

## Tek Komut

En az `api-finance + api-metadata` calistirmak icin:

```bash
npm run dev:services
```

Bu komut:
- `apps/api-finance` -> `npm run dev`
- `apps/api-metadata` -> `npm run dev`

processlerini paralel baslatir.

## Port / Env Standardi

- `API_AUTH_PORT` (default: `3101`)
- `API_FINANCE_PORT` (default: `3102`)
- `API_METADATA_PORT` (default: `3103`)
- `API_SUPPORT_PORT` (default: `3104`)

Not:
- Shell runtime hem `/health` hem `/api/v1/health` endpointlerini 200 ile doner.
- Bu asamada shell server kullanilir; full Nest runtime toolchain/CI asamasinda devreye alinacaktir.

## Ornek

```bash
API_FINANCE_PORT=3202 API_METADATA_PORT=3203 npm run dev:services
```

## Beklenen Cikti

- `api-finance` ve `api-metadata` processleri ayni anda ayakta.
- Ctrl+C ile iki process birlikte kapanir.

## Restricted Environment Notu

- Bazi sandbox/CI ortamlari TCP socket bind (`listen`) izni vermeyebilir (`EPERM`).
- Bu durumda `start-service-shell.mjs` process'i dusurmez, `mock-shell mode` ile ayakta kalir.
- `mock-shell mode` sirasinda TCP dinleme olmadigi icin `/health` endpointi ulasilabilir degildir; bu dogrulama normal dev runner veya CI integration ortaminda yapilmalidir.
