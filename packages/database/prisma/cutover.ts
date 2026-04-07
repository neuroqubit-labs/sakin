import {
  DuesStatus,
  LedgerEntryType,
  LedgerReferenceType,
  OccupancyRole,
  PaymentStatus,
  PrismaClient,
} from '@prisma/client'

const prisma = new PrismaClient()

const KNOWN_PAYMENT_STATUSES = new Set([
  PaymentStatus.PENDING,
  PaymentStatus.CONFIRMED,
  PaymentStatus.FAILED,
  PaymentStatus.CANCELLED,
  PaymentStatus.REFUNDED,
])

function nowIso() {
  return new Date().toISOString()
}

function mapLegacyResidentTypeToOccupancyRole(value: string | null | undefined): OccupancyRole {
  if (value === 'OWNER') return OccupancyRole.OWNER
  if (value === 'TENANT') return OccupancyRole.TENANT
  if (value === 'CONTACT') return OccupancyRole.CONTACT
  return OccupancyRole.RESPONSIBLE
}

function calculateStatusFromRemaining(amount: number, remaining: number, dueDate: Date): DuesStatus {
  if (remaining <= 0.001) return DuesStatus.PAID
  if (remaining < amount - 0.001) return dueDate < new Date() ? DuesStatus.OVERDUE : DuesStatus.PARTIALLY_PAID
  return dueDate < new Date() ? DuesStatus.OVERDUE : DuesStatus.PENDING
}

async function mapDuesRemainingByLedger(tenantId: string, duesIds: string[]) {
  const remainingMap = new Map<string, number>()
  if (duesIds.length === 0) return remainingMap

  const [duesEntries, duesLinkedPayments] = await Promise.all([
    prisma.ledgerEntry.findMany({
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
    prisma.payment.findMany({
      where: {
        tenantId,
        duesId: { in: duesIds },
        status: PaymentStatus.CONFIRMED,
      },
      select: { id: true, duesId: true },
    }),
  ])

  for (const entry of duesEntries) {
    remainingMap.set(entry.referenceId, (remainingMap.get(entry.referenceId) ?? 0) + Number(entry.amount))
  }

  if (duesLinkedPayments.length === 0) return remainingMap

  const paymentIdToDuesId = new Map<string, string>()
  const paymentIds: string[] = []
  for (const payment of duesLinkedPayments) {
    if (!payment.duesId) continue
    paymentIdToDuesId.set(payment.id, payment.duesId)
    paymentIds.push(payment.id)
  }

  if (paymentIds.length === 0) return remainingMap

  const paymentEntries = await prisma.ledgerEntry.findMany({
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
    remainingMap.set(dueId, (remainingMap.get(dueId) ?? 0) + Number(entry.amount))
  }

  return remainingMap
}

async function runPreflight() {
  const residentColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'residents'
  `
  const hasLegacyResidentUnit = residentColumns.some((row) => row.column_name === 'unit_id')

  const paymentStatusRows = await prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
    SELECT status::text AS status, COUNT(*)::bigint AS count
    FROM payments
    GROUP BY status::text
  `
  const unknownPaymentStatuses = paymentStatusRows
    .map((row) => row.status)
    .filter((status) => !KNOWN_PAYMENT_STATUSES.has(status as PaymentStatus) && status !== 'SUCCESS' && status !== 'PAID' && status !== 'CANCELED')

  if (unknownPaymentStatuses.length > 0) {
    throw new Error(`Preflight başarısız: bilinmeyen payment status değerleri: ${unknownPaymentStatuses.join(', ')}`)
  }

  const duesPaymentMismatchRow = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM payments p
    JOIN dues d ON d.id = p.dues_id
    WHERE p.dues_id IS NOT NULL
      AND (p.tenant_id <> d.tenant_id OR p.unit_id <> d.unit_id)
  `
  const duesPaymentMismatch = Number(duesPaymentMismatchRow[0]?.count ?? 0n)
  if (duesPaymentMismatch > 0) {
    throw new Error(`Preflight başarısız: ${duesPaymentMismatch} adet payment-dues tenant/unit mismatch bulundu`)
  }

  let legacyResidentUnitCount = 0
  if (hasLegacyResidentUnit) {
    const residentUnitMismatchRow = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM residents r
      JOIN units u ON u.id = r.unit_id
      WHERE r.unit_id IS NOT NULL
        AND r.tenant_id <> u.tenant_id
    `
    const residentUnitMismatch = Number(residentUnitMismatchRow[0]?.count ?? 0n)
    if (residentUnitMismatch > 0) {
      throw new Error(`Preflight başarısız: ${residentUnitMismatch} adet resident-unit tenant mismatch bulundu`)
    }

    const legacyResidentUnitsRow = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM residents r
      WHERE r.unit_id IS NOT NULL
    `
    legacyResidentUnitCount = Number(legacyResidentUnitsRow[0]?.count ?? 0n)
  }

  const legacySuccessStatusRow = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM payments
    WHERE status::text IN ('SUCCESS', 'PAID', 'CANCELED')
  `

  return {
    hasLegacyResidentUnit,
    legacyResidentUnitCount,
    legacyStatusRows: Number(legacySuccessStatusRow[0]?.count ?? 0n),
  }
}

async function normalizeLegacyPaymentStatuses() {
  const normalizedConfirmed = await prisma.$executeRawUnsafe(`
    UPDATE payments
    SET status = 'CONFIRMED',
        confirmed_at = COALESCE(confirmed_at, paid_at, NOW()),
        paid_at = COALESCE(paid_at, NOW())
    WHERE status::text IN ('SUCCESS', 'PAID')
  `)

  const normalizedCancelled = await prisma.$executeRawUnsafe(`
    UPDATE payments
    SET status = 'CANCELLED',
        cancelled_at = COALESCE(cancelled_at, NOW())
    WHERE status::text = 'CANCELED'
  `)

  return {
    normalizedConfirmed: Number(normalizedConfirmed ?? 0),
    normalizedCancelled: Number(normalizedCancelled ?? 0),
  }
}

async function backfillLegacyOccupancies() {
  const legacyRows = await prisma.$queryRaw<
    Array<{
      resident_id: string
      tenant_id: string
      unit_id: string
      resident_type: string | null
      created_at: Date | null
    }>
  >`
    SELECT
      r.id AS resident_id,
      r.tenant_id,
      r.unit_id,
      r.type::text AS resident_type,
      r.created_at
    FROM residents r
    LEFT JOIN unit_occupancies o
      ON o.tenant_id = r.tenant_id
      AND o.unit_id = r.unit_id
      AND o.resident_id = r.id
      AND o.is_active = true
    WHERE r.unit_id IS NOT NULL
      AND o.id IS NULL
  `

  let created = 0
  for (const row of legacyRows) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.unitOccupancy.create({
      data: {
        tenantId: row.tenant_id,
        unitId: row.unit_id,
        residentId: row.resident_id,
        role: mapLegacyResidentTypeToOccupancyRole(row.resident_type),
        isPrimaryResponsible: true,
        startDate: row.created_at ?? new Date(),
        isActive: true,
        note: 'V2 cutover legacy Resident->Unit backfill',
      },
    })
    created += 1
  }

  return created
}

async function ensureChargeEntries(tenantId: string) {
  const dues = await prisma.dues.findMany({
    where: { tenantId },
    select: {
      id: true,
      unitId: true,
      amount: true,
      currency: true,
      dueDate: true,
      description: true,
    },
  })

  let created = 0
  for (const due of dues) {
    const idempotencyKey = `dues-charge-${due.id}`
    // eslint-disable-next-line no-await-in-loop
    const exists = await prisma.ledgerEntry.findFirst({
      where: {
        tenantId,
        idempotencyKey,
      },
      select: { id: true },
    })
    if (exists) continue

    // eslint-disable-next-line no-await-in-loop
    await prisma.ledgerEntry.create({
      data: {
        tenantId,
        unitId: due.unitId,
        amount: due.amount,
        currency: due.currency,
        entryType: LedgerEntryType.CHARGE,
        referenceType: LedgerReferenceType.DUES,
        referenceId: due.id,
        idempotencyKey,
        effectiveAt: due.dueDate,
        note: due.description ?? undefined,
      },
    })
    created += 1
  }

  return created
}

async function ensurePaymentEntries(tenantId: string) {
  const payments = await prisma.payment.findMany({
    where: {
      tenantId,
      status: PaymentStatus.CONFIRMED,
    },
    select: {
      id: true,
      unitId: true,
      amount: true,
      currency: true,
      paidAt: true,
      note: true,
    },
  })

  let created = 0
  for (const payment of payments) {
    const idempotencyKey = `payment-confirmed-${payment.id}`
    // eslint-disable-next-line no-await-in-loop
    const exists = await prisma.ledgerEntry.findFirst({
      where: {
        tenantId,
        idempotencyKey,
      },
      select: { id: true },
    })
    if (exists) continue

    // eslint-disable-next-line no-await-in-loop
    await prisma.ledgerEntry.create({
      data: {
        tenantId,
        unitId: payment.unitId,
        amount: Number(payment.amount) * -1,
        currency: payment.currency,
        entryType: LedgerEntryType.PAYMENT,
        referenceType: LedgerReferenceType.PAYMENT,
        referenceId: payment.id,
        idempotencyKey,
        effectiveAt: payment.paidAt ?? new Date(),
        note: payment.note ?? undefined,
      },
    })
    created += 1
  }

  return created
}

async function refreshDuesStatuses(tenantId: string) {
  const dues = await prisma.dues.findMany({
    where: { tenantId },
    select: {
      id: true,
      amount: true,
      dueDate: true,
      status: true,
    },
  })

  const remainingMap = await mapDuesRemainingByLedger(
    tenantId,
    dues.map((due) => due.id),
  )

  let updated = 0
  for (const due of dues) {
    if (due.status === DuesStatus.WAIVED || due.status === DuesStatus.CANCELLED) continue

    const remaining = Math.max(0, remainingMap.get(due.id) ?? Number(due.amount))
    const nextStatus = calculateStatusFromRemaining(Number(due.amount), remaining, due.dueDate)

    if (nextStatus !== due.status) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.dues.update({
        where: { id: due.id },
        data: { status: nextStatus },
      })
      updated += 1
    }
  }

  return updated
}

async function verifyTenant(tenantId: string) {
  const [chargeTotal, paymentTotal, netBalance] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: { tenantId, entryType: LedgerEntryType.CHARGE },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: {
        tenantId,
        entryType: {
          in: [
            LedgerEntryType.PAYMENT,
            LedgerEntryType.REFUND,
            LedgerEntryType.WAIVER,
            LedgerEntryType.ADJUSTMENT,
          ],
        },
      },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { tenantId },
      _sum: { amount: true },
    }),
  ])

  const [missingChargeRows, missingPaymentLedgerRows] = await Promise.all([
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM dues d
      LEFT JOIN ledger_entries le
        ON le.tenant_id = d.tenant_id
       AND le.reference_type = 'DUES'
       AND le.reference_id = d.id
       AND le.entry_type = 'CHARGE'
      WHERE d.tenant_id = ${tenantId}
        AND le.id IS NULL
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM payments p
      LEFT JOIN ledger_entries le
        ON le.tenant_id = p.tenant_id
       AND le.reference_type = 'PAYMENT'
       AND le.reference_id = p.id
       AND le.entry_type = 'PAYMENT'
      WHERE p.tenant_id = ${tenantId}
        AND p.status = 'CONFIRMED'
        AND le.id IS NULL
    `,
  ])

  const dues = await prisma.dues.findMany({
    where: { tenantId },
    select: { id: true, amount: true },
  })
  const remainingMap = await mapDuesRemainingByLedger(
    tenantId,
    dues.map((row) => row.id),
  )
  const overCollectedDues = dues.filter((row) => (remainingMap.get(row.id) ?? Number(row.amount)) < -0.01).length

  const missingCharges = Number(missingChargeRows[0]?.count ?? 0n)
  const missingPayments = Number(missingPaymentLedgerRows[0]?.count ?? 0n)

  if (missingCharges > 0 || missingPayments > 0 || overCollectedDues > 0) {
    throw new Error(
      `Tenant doğrulaması başarısız (${tenantId}) missingCharges=${missingCharges}, missingPayments=${missingPayments}, overCollectedDues=${overCollectedDues}`,
    )
  }

  return {
    tenantId,
    totalCharge: Number(chargeTotal._sum.amount ?? 0),
    totalPaymentAndAdjustments: Number(paymentTotal._sum.amount ?? 0),
    netBalance: Number(netBalance._sum.amount ?? 0),
  }
}

async function ensureAppendOnlyGuard() {
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION ledger_entries_append_only_guard()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'ledger_entries is append-only';
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `)

  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS trg_ledger_entries_no_update ON ledger_entries;
    CREATE TRIGGER trg_ledger_entries_no_update
    BEFORE UPDATE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION ledger_entries_append_only_guard();
  `)

  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS trg_ledger_entries_no_delete ON ledger_entries;
    CREATE TRIGGER trg_ledger_entries_no_delete
    BEFORE DELETE ON ledger_entries
    FOR EACH ROW EXECUTE FUNCTION ledger_entries_append_only_guard();
  `)
}

async function run() {
  console.log(`[${nowIso()}] Cutover preflight started`)
  const preflight = await runPreflight()
  console.log(
    `[${nowIso()}] Preflight: legacyResidentUnitColumn=${preflight.hasLegacyResidentUnit}, legacyResidentUnitCount=${preflight.legacyResidentUnitCount}, legacyStatusRows=${preflight.legacyStatusRows}`,
  )

  console.log(`[${nowIso()}] Enabling ledger append-only guards`)
  await ensureAppendOnlyGuard()

  console.log(`[${nowIso()}] Normalizing legacy payment statuses`)
  const normalized = await normalizeLegacyPaymentStatuses()
  console.log(
    `[${nowIso()}] Payment status normalization: confirmed=${normalized.normalizedConfirmed}, cancelled=${normalized.normalizedCancelled}`,
  )

  if (preflight.hasLegacyResidentUnit) {
    console.log(`[${nowIso()}] Backfilling unit occupancies from legacy resident->unit links`)
    const occupanciesCreated = await backfillLegacyOccupancies()
    console.log(`[${nowIso()}] Occupancy backfill created=${occupanciesCreated}`)
  }

  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`[${nowIso()}] Cutover backfill started for ${tenants.length} active tenant(s)`)
  for (const tenant of tenants) {
    console.log(`[${nowIso()}] Processing tenant ${tenant.name} (${tenant.id})`)

    const chargesCreated = await ensureChargeEntries(tenant.id)
    const paymentsCreated = await ensurePaymentEntries(tenant.id)
    const duesUpdated = await refreshDuesStatuses(tenant.id)
    const verification = await verifyTenant(tenant.id)

    console.log(
      `[${nowIso()}] Tenant ${tenant.id}: chargesCreated=${chargesCreated}, paymentsCreated=${paymentsCreated}, duesUpdated=${duesUpdated}`,
    )
    console.log(
      `[${nowIso()}] Tenant ${tenant.id}: totalCharge=${verification.totalCharge}, totalPaymentAndAdjustments=${verification.totalPaymentAndAdjustments}, netBalance=${verification.netBalance}`,
    )
  }

  console.log(`[${nowIso()}] Cutover backfill completed successfully`)
}

run()
  .catch((error) => {
    console.error(`[${nowIso()}] Cutover backfill failed`, error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
