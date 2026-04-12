import { DuesStatus } from '@sakin/shared'

type NumericLike = number | string | bigint | { toString(): string } | null | undefined

export function toMoneyNumber(value: NumericLike): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'bigint') return Number(value)

  const parsed = Number(value.toString())
  return Number.isFinite(parsed) ? parsed : 0
}

export function sumMoney(values: NumericLike[]): number {
  return values.reduce<number>((sum, value) => sum + toMoneyNumber(value), 0)
}

export function calculateDuesStatus(
  amount: NumericLike,
  paidAmount: NumericLike,
  dueDate: Date,
  now = new Date(),
): DuesStatus {
  const dueAmount = toMoneyNumber(amount)
  const paid = toMoneyNumber(paidAmount)

  if (paid >= dueAmount - 0.001) return DuesStatus.PAID
  if (paid > 0) return dueDate < now ? DuesStatus.OVERDUE : DuesStatus.PARTIALLY_PAID
  return dueDate < now ? DuesStatus.OVERDUE : DuesStatus.PENDING
}

export function normalizeDebt(value: NumericLike): number {
  return Math.max(0, toMoneyNumber(value))
}
