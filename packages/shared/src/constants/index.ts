export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const

export const DUES = {
  /** Gecikme faizi oranı (aylık %) */
  DEFAULT_LATE_FEE_RATE: 0,
  MIN_AMOUNT: 0,
} as const

export const AUTH = {
  TOKEN_HEADER: 'authorization',
  BEARER_PREFIX: 'Bearer ',
} as const

export const MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const
