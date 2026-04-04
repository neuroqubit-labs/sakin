export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  STAFF = 'STAFF',
  RESIDENT = 'RESIDENT',
}

export enum ResidentType {
  OWNER = 'OWNER',
  TENANT = 'TENANT',
}

export enum UnitType {
  APARTMENT = 'APARTMENT',
  COMMERCIAL = 'COMMERCIAL',
  STORAGE = 'STORAGE',
  PARKING = 'PARKING',
}

export enum DuesStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  WAIVED = 'WAIVED',
}

export enum PaymentMethod {
  ONLINE = 'ONLINE',
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}
