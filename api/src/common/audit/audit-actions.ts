export const AUDIT_ACTIONS = {
  PAYMENT_MANUAL_CONFIRMED: 'payment.manual.confirmed',
  PAYMENT_BANK_TRANSFER_REJECTED: 'payment.bank_transfer.rejected',
  PAYMENT_BANK_TRANSFER_CONFIRMED: 'payment.bank_transfer.confirmed',
  EXPORT_BATCH_CREATED: 'export.batch.created',
  EXPORT_BATCH_COMPLETED: 'export.batch.completed',
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]
