const envFromProcess = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env?.EXPO_PUBLIC_ENV

export const APP_ENV: 'development' | 'staging' | 'production' =
  envFromProcess === 'production'
    ? 'production'
    : envFromProcess === 'staging'
      ? 'staging'
      : 'development'

/**
 * Dev bypass yalnız iki kilit birden açık olduğunda etkin:
 * 1) __DEV__ (Metro / dev build)
 * 2) EXPO_PUBLIC_ENV === 'development' (eas.json profiline göre)
 *
 * Production bundle'da her iki kilit de kapalı olur — x-dev-tenant-id header'ı
 * ve "Firebase olmadan test giriş" butonu prod'da görünmez/çalışmaz.
 */
export const DEV_BYPASS_ENABLED: boolean = __DEV__ && APP_ENV === 'development'
