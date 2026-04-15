export type CallbackStatus = 'success' | 'failure' | 'unknown'

/**
 * iyzico → `sakin://payment/callback?status=...` geri dönüş parse'ı.
 * Açık başarı sinyali yoksa iyimser davranma — `unknown` döner ve mobil
 * ekran refetch ile gerçek durumu kontrol eder.
 */
export function parseCallbackStatus(url: string): CallbackStatus {
  try {
    const parsed = new URL(url)
    const status = parsed.searchParams.get('status')
    if (status === 'success') return 'success'
    if (status === 'failure' || status === 'error' || status === 'cancelled') return 'failure'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}
