export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  STAFF = 'STAFF',
  RESIDENT = 'RESIDENT',
}

export enum ResidentType {
  OWNER = 'OWNER',
  TENANT = 'TENANT',
  CONTACT = 'CONTACT',
}

export enum OccupancyRole {
  OWNER = 'OWNER',
  TENANT = 'TENANT',
  RESPONSIBLE = 'RESPONSIBLE',
  CONTACT = 'CONTACT',
}

export enum UnitType {
  APARTMENT = 'APARTMENT',
  COMMERCIAL = 'COMMERCIAL',
  STORAGE = 'STORAGE',
  PARKING = 'PARKING',
}

export enum DuesType {
  AIDAT = 'AIDAT',
  EXTRA = 'EXTRA',
}

export enum DuesStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  WAIVED = 'WAIVED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  ONLINE_CARD = 'ONLINE_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  POS = 'POS',
}

export enum PaymentChannel {
  RESIDENT_WEB = 'RESIDENT_WEB',
  RESIDENT_MOBILE = 'RESIDENT_MOBILE',
  STAFF_PANEL = 'STAFF_PANEL',
}

export enum PaymentProvider {
  IYZICO = 'IYZICO',
  MANUAL = 'MANUAL',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentAttemptStatus {
  INITIATED = 'INITIATED',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum ProviderEventStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  DUPLICATE = 'DUPLICATE',
}

export enum LedgerEntryType {
  CHARGE = 'CHARGE',
  PAYMENT = 'PAYMENT',
  ADJUSTMENT = 'ADJUSTMENT',
  WAIVER = 'WAIVER',
  REFUND = 'REFUND',
}

export enum LedgerReferenceType {
  DUES = 'DUES',
  PAYMENT = 'PAYMENT',
  ADJUSTMENT = 'ADJUSTMENT',
  WAIVER = 'WAIVER',
  REFUND = 'REFUND',
  MANUAL = 'MANUAL',
}

export enum ExportType {
  COLLECTIONS = 'COLLECTIONS',
  DUES = 'DUES',
  LEDGER = 'LEDGER',
  ACCOUNTING = 'ACCOUNTING',
}

export enum ExportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum NotificationChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export enum GatewayMode {
  TEST = 'TEST',
  LIVE = 'LIVE',
}

export enum ExpenseCategory {
  MAINTENANCE = 'MAINTENANCE',
  CLEANING = 'CLEANING',
  SECURITY = 'SECURITY',
  UTILITIES = 'UTILITIES',
  INSURANCE = 'INSURANCE',
  MANAGEMENT_FEE = 'MANAGEMENT_FEE',
  OTHER = 'OTHER',
}

export enum PlanType {
  TRIAL = 'TRIAL',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum CashAccountType {
  CASH = 'CASH',
  BANK = 'BANK',
}

export enum CashTransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

export enum CashReferenceType {
  PAYMENT = 'PAYMENT',
  EXPENSE = 'EXPENSE',
  MANUAL = 'MANUAL',
}

export enum SiteStaffRole {
  CLEANING = 'CLEANING',
  SECURITY = 'SECURITY',
  MAINTENANCE = 'MAINTENANCE',
  MANAGEMENT = 'MANAGEMENT',
  OTHER = 'OTHER',
}
