export function formatTry(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatShortDate(value: string | Date | null): string {
  if (!value) return '-'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export function formatDateTime(value: string | Date | null): string {
  if (!value) return '-'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function duesStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Bekliyor'
    case 'PAID':
      return 'Ödendi'
    case 'OVERDUE':
      return 'Gecikmiş'
    case 'PARTIALLY_PAID':
      return 'Kısmi Ödendi'
    case 'WAIVED':
      return 'Affedildi'
    default:
      return status
  }
}

export function duesStatusTone(status: string): 'danger' | 'success' | 'warning' | 'neutral' {
  if (status === 'OVERDUE') return 'danger'
  if (status === 'PAID') return 'success'
  if (status === 'PARTIALLY_PAID' || status === 'PENDING') return 'warning'
  return 'neutral'
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case 'CASH':
      return 'Nakit'
    case 'POS':
      return 'POS'
    case 'BANK_TRANSFER':
      return 'Banka Transferi'
    case 'ONLINE_CARD':
      return 'Online'
    default:
      return method
  }
}

export function paymentStatusLabel(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return 'Başarılı'
    case 'FAILED':
      return 'Başarısız'
    case 'PENDING':
      return 'Bekliyor'
    case 'CANCELLED':
      return 'İptal'
    case 'REFUNDED':
      return 'İade'
    default:
      return status
  }
}

export function paymentStatusTone(status: string): 'danger' | 'success' | 'warning' | 'neutral' {
  if (status === 'CONFIRMED') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'PENDING') return 'warning'
  return 'neutral'
}

export function riskLabel(level: string): string {
  if (level === 'HIGH') return 'Yüksek Risk'
  if (level === 'MEDIUM') return 'Orta Risk'
  if (level === 'LOW') return 'Düşük Risk'
  return level
}

export function riskTone(level: string): 'danger' | 'success' | 'warning' | 'neutral' {
  if (level === 'HIGH') return 'danger'
  if (level === 'MEDIUM') return 'warning'
  if (level === 'LOW') return 'success'
  return 'neutral'
}
