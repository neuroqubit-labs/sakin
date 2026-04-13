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
  GARDEN_FLOOR = 'GARDEN_FLOOR',
  PENTHOUSE = 'PENTHOUSE',
  DUPLEX = 'DUPLEX',
  OFFICE = 'OFFICE',
}

export enum DuesType {
  AIDAT = 'AIDAT',
  EXTRA = 'EXTRA',
  YAKACAK = 'YAKACAK',
  ASANSOR = 'ASANSOR',
  ONARIM = 'ONARIM',
  ISLETME = 'ISLETME',
  OTOPARK = 'OTOPARK',
  ORTAK_ALAN = 'ORTAK_ALAN',
  AIDAT_FARKI = 'AIDAT_FARKI',
  DIGER = 'DIGER',
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

export enum PaymentPurpose {
  DUES = 'DUES',
  ADVANCE = 'ADVANCE',
  OVERPAYMENT = 'OVERPAYMENT',
  LEGAL = 'LEGAL',
  OTHER = 'OTHER',
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
  EXPENSE = 'EXPENSE',
}

export enum LedgerReferenceType {
  DUES = 'DUES',
  PAYMENT = 'PAYMENT',
  ADJUSTMENT = 'ADJUSTMENT',
  WAIVER = 'WAIVER',
  REFUND = 'REFUND',
  MANUAL = 'MANUAL',
  EXPENSE = 'EXPENSE',
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
  ELEVATOR = 'ELEVATOR',
  HEATING_FUEL = 'HEATING_FUEL',
  WATER = 'WATER',
  ELECTRICITY = 'ELECTRICITY',
  NATURAL_GAS = 'NATURAL_GAS',
  GARDEN = 'GARDEN',
  PEST_CONTROL = 'PEST_CONTROL',
  POOL = 'POOL',
  LEGAL = 'LEGAL',
  TAXES = 'TAXES',
  STAFF_SALARY = 'STAFF_SALARY',
  RENOVATION = 'RENOVATION',
  EQUIPMENT = 'EQUIPMENT',
  COMMUNICATION = 'COMMUNICATION',
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

// ──────────────────────────────────────────
// Talep / Ariza
// ──────────────────────────────────────────

export enum TicketCategory {
  ELEVATOR = 'ELEVATOR',
  PLUMBING = 'PLUMBING',
  ELECTRICAL = 'ELECTRICAL',
  CLEANING = 'CLEANING',
  HEATING = 'HEATING',
  SECURITY = 'SECURITY',
  PARKING = 'PARKING',
  GARDEN = 'GARDEN',
  COMMON_AREA = 'COMMON_AREA',
  NOISE = 'NOISE',
  PEST = 'PEST',
  OTHER = 'OTHER',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING = 'WAITING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

// ──────────────────────────────────────────
// Hukuki Takip
// ──────────────────────────────────────────

export enum LegalCaseStage {
  WARNING_SENT = 'WARNING_SENT',
  LEGAL_NOTICE = 'LEGAL_NOTICE',
  LAWSUIT_FILED = 'LAWSUIT_FILED',
  JUDGMENT = 'JUDGMENT',
  ENFORCEMENT = 'ENFORCEMENT',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

export enum LegalCaseStatus {
  ACTIVE = 'ACTIVE',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

// ──────────────────────────────────────────
// Belge
// ──────────────────────────────────────────

export enum DocumentOwnerType {
  SITE = 'SITE',
  UNIT = 'UNIT',
  TICKET = 'TICKET',
  CONTRACT = 'CONTRACT',
  LEGAL_CASE = 'LEGAL_CASE',
  EXPENSE = 'EXPENSE',
  MEETING = 'MEETING',
}

export enum DocumentType {
  RECEIPT = 'RECEIPT',
  INVOICE = 'INVOICE',
  CONTRACT = 'CONTRACT',
  INSURANCE = 'INSURANCE',
  MEETING_MINUTES = 'MEETING_MINUTES',
  PHOTO = 'PHOTO',
  REPORT = 'REPORT',
  LEGAL = 'LEGAL',
  OTHER = 'OTHER',
}

// ──────────────────────────────────────────
// Sozlesme
// ──────────────────────────────────────────

export enum ContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  RENEWED = 'RENEWED',
}

// ──────────────────────────────────────────
// Iletisim
// ──────────────────────────────────────────

export enum CommunicationChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

export enum CommunicationStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
}

// ──────────────────────────────────────────
// Tesis
// ──────────────────────────────────────────

export enum FacilityType {
  POOL = 'POOL',
  GYM = 'GYM',
  PARKING_LOT = 'PARKING_LOT',
  GENERATOR = 'GENERATOR',
  PLAYGROUND = 'PLAYGROUND',
  MEETING_ROOM = 'MEETING_ROOM',
  SAUNA = 'SAUNA',
  GARDEN = 'GARDEN',
  ELEVATOR = 'ELEVATOR',
  SECURITY_BOOTH = 'SECURITY_BOOTH',
  OTHER = 'OTHER',
}

// ──────────────────────────────────────────
// Toplanti
// ──────────────────────────────────────────

export enum MeetingType {
  ORDINARY = 'ORDINARY',
  EXTRAORDINARY = 'EXTRAORDINARY',
}

export enum MeetingStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum DecisionResult {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  POSTPONED = 'POSTPONED',
}
