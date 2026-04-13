import { LedgerReferenceType, PaymentStatus } from '@sakin/shared'
import { toMoneyNumber } from './finance.utils'

type NumericLike = number | string | bigint | { toString(): string } | null | undefined

type PrismaLike = {
  payment: {
    findMany(args: unknown): Promise<Array<{ id: string; duesId: string | null }>>
  }
  ledgerEntry: {
    findMany(args: unknown): Promise<Array<{ referenceId: string; amount: NumericLike }>>
  }
}

/**
 * Verilen dues ID'leri için ledger tabanlı kalan borç hesabı yapar.
 * Pozitif değer = borç kalan, negatif değer = fazla ödeme.
 */
export async function mapDuesRemainingByLedger(
  db: PrismaLike,
  tenantId: string,
  duesIds: string[],
): Promise<Map<string, number>> {
  const remainingMap = new Map<string, number>()
  if (duesIds.length === 0) return remainingMap

  const [duesLinkedPayments, duesEntries] = await Promise.all([
    db.payment.findMany({
      where: {
        tenantId,
        duesId: { in: duesIds },
        status: PaymentStatus.CONFIRMED,
      },
      select: { id: true, duesId: true },
    }),
    db.ledgerEntry.findMany({
      where: {
        tenantId,
        OR: [
          { referenceType: LedgerReferenceType.DUES, referenceId: { in: duesIds } },
          { referenceType: LedgerReferenceType.WAIVER, referenceId: { in: duesIds } },
          { referenceType: LedgerReferenceType.ADJUSTMENT, referenceId: { in: duesIds } },
        ],
      },
      select: { referenceId: true, amount: true },
    }),
  ])

  for (const entry of duesEntries) {
    remainingMap.set(
      entry.referenceId,
      (remainingMap.get(entry.referenceId) ?? 0) + toMoneyNumber(entry.amount),
    )
  }

  const paymentIdToDuesId = new Map<string, string>()
  const paymentIds: string[] = []

  for (const payment of duesLinkedPayments) {
    if (!payment.duesId) continue
    paymentIds.push(payment.id)
    paymentIdToDuesId.set(payment.id, payment.duesId)
  }

  if (paymentIds.length > 0) {
    const paymentEntries = await db.ledgerEntry.findMany({
      where: {
        tenantId,
        referenceType: LedgerReferenceType.PAYMENT,
        referenceId: { in: paymentIds },
      },
      select: { referenceId: true, amount: true },
    })

    for (const entry of paymentEntries) {
      const dueId = paymentIdToDuesId.get(entry.referenceId)
      if (!dueId) continue
      remainingMap.set(dueId, (remainingMap.get(dueId) ?? 0) + toMoneyNumber(entry.amount))
    }
  }

  return remainingMap
}
