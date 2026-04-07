import {
  PrismaClient,
  PaymentStatus,
  PaymentMethod,
  PaymentChannel,
  PaymentProvider,
  DuesStatus,
  LedgerEntryType,
  LedgerReferenceType,
  UserRole,
} from '@prisma/client'
import { randomUUID } from 'node:crypto'

const prisma = new PrismaClient()

async function ensureUserRole(input: {
  userId: string
  tenantId: string | null
  role: UserRole
  isActive?: boolean
}) {
  const existing = await prisma.userTenantRole.findFirst({
    where: {
      userId: input.userId,
      tenantId: input.tenantId,
    },
  })

  if (existing) {
    return prisma.userTenantRole.update({
      where: { id: existing.id },
      data: {
        role: input.role,
        isActive: input.isActive ?? true,
      },
    })
  }

  return prisma.userTenantRole.create({
    data: {
      userId: input.userId,
      tenantId: input.tenantId,
      role: input.role,
      isActive: input.isActive ?? true,
    },
  })
}

async function ensureUser(input: {
  firebaseUid: string
  email: string
  displayName: string
  role: UserRole
  tenantIdForLegacy: string
  usesLegacyUserColumns: boolean
}) {
  if (input.usesLegacyUserColumns) {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "users" ("id", "firebaseUid", "email", "displayName", "isActive", "tenantId", "role", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${input.firebaseUid}, ${input.email}, ${input.displayName}, true, ${input.tenantIdForLegacy}, ${input.role}::"UserRole", NOW(), NOW())
      ON CONFLICT ("firebaseUid")
      DO UPDATE SET
        "email" = EXCLUDED."email",
        "displayName" = EXCLUDED."displayName",
        "isActive" = true,
        "tenantId" = EXCLUDED."tenantId",
        "role" = EXCLUDED."role",
        "updatedAt" = NOW()
      RETURNING "id"
    `

    if (!rows[0]?.id) {
      throw new Error(`Legacy user upsert başarısız: ${input.firebaseUid}`)
    }

    return { id: rows[0].id }
  }

  return prisma.user.upsert({
    where: { firebaseUid: input.firebaseUid },
    update: {
      email: input.email,
      displayName: input.displayName,
      isActive: true,
    },
    create: {
      firebaseUid: input.firebaseUid,
      email: input.email,
      displayName: input.displayName,
    },
    select: { id: true },
  })
}

async function ensureLedgerEntry(input: {
  tenantId: string
  unitId: string
  amount: number
  entryType: LedgerEntryType
  referenceType: LedgerReferenceType
  referenceId: string
  idempotencyKey: string
  effectiveAt: Date
  note?: string
  createdByUserId?: string
}) {
  const existing = await prisma.ledgerEntry.findFirst({
    where: {
      tenantId: input.tenantId,
      idempotencyKey: input.idempotencyKey,
    },
  })

  if (existing) return existing

  return prisma.ledgerEntry.create({
    data: {
      tenantId: input.tenantId,
      unitId: input.unitId,
      amount: input.amount,
      currency: 'TRY',
      entryType: input.entryType,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      idempotencyKey: input.idempotencyKey,
      effectiveAt: input.effectiveAt,
      note: input.note,
      createdByUserId: input.createdByUserId,
    },
  })
}

async function main() {
  console.log('🌱 Seed başlatılıyor...')

  const userColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
  `

  const hasLegacyUserTenantId = userColumns.some((col) => col.column_name === 'tenantId')
  const hasLegacyUserRole = userColumns.some((col) => col.column_name === 'role')
  const usesLegacyUserColumns = hasLegacyUserTenantId && hasLegacyUserRole

  const roleTableCheck = await prisma.$queryRaw<Array<{ regclass: string | null }>>`
    SELECT to_regclass('public.user_tenant_roles')::text AS regclass
  `
  const hasUserTenantRolesTable = Boolean(roleTableCheck[0]?.regclass)

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-yonetim' },
    update: {},
    create: {
      name: 'Demo Yönetim A.Ş.',
      slug: 'demo-yonetim',
      contactEmail: 'admin@demo-yonetim.com',
      contactPhone: '05321234567',
      city: 'Kayseri',
      address: 'Kocasinan İlçesi, Cumhuriyet Mah. No:1',
    },
  })

  const superAdmin = await ensureUser({
    firebaseUid: 'dev-super-admin',
    email: 'superadmin@sakin.app',
    displayName: 'Platform Admin',
    role: UserRole.SUPER_ADMIN,
    tenantIdForLegacy: tenant.id,
    usesLegacyUserColumns,
  })

  if (hasUserTenantRolesTable) {
    await ensureUserRole({
      userId: superAdmin.id,
      tenantId: null,
      role: UserRole.SUPER_ADMIN,
    })
  }

  const adminUser = await ensureUser({
    firebaseUid: 'dev-admin-user',
    email: 'admin@demo-yonetim.com',
    displayName: 'Demo Admin',
    role: UserRole.TENANT_ADMIN,
    tenantIdForLegacy: tenant.id,
    usesLegacyUserColumns,
  })

  if (hasUserTenantRolesTable) {
    await ensureUserRole({
      userId: adminUser.id,
      tenantId: tenant.id,
      role: UserRole.TENANT_ADMIN,
    })
  }

  const staffUser = await ensureUser({
    firebaseUid: 'dev-staff-user',
    email: 'staff@demo-yonetim.com',
    displayName: 'Demo Staff',
    role: UserRole.STAFF,
    tenantIdForLegacy: tenant.id,
    usesLegacyUserColumns,
  })

  if (hasUserTenantRolesTable) {
    await ensureUserRole({
      userId: staffUser.id,
      tenantId: tenant.id,
      role: UserRole.STAFF,
    })
  }

  const site1 = await prisma.site.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Güneş Apartmanı' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Güneş Apartmanı',
      address: 'Cumhuriyet Mah. Güneş Sokak No:5',
      city: 'Kayseri',
      district: 'Kocasinan',
      totalUnits: 8,
      hasBlocks: false,
    },
  })

  const site2 = await prisma.site.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Yıldız Sitesi' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Yıldız Sitesi',
      address: 'Mimarsinan Mah. Yıldız Cad. No:12',
      city: 'Kayseri',
      district: 'Melikgazi',
      totalUnits: 12,
      hasBlocks: true,
    },
  })

  const gateway = await prisma.tenantPaymentGatewayConfig.findFirst({
    where: { tenantId: tenant.id, provider: 'IYZICO' },
  })

  if (!gateway) {
    await prisma.tenantPaymentGatewayConfig.create({
      data: {
        tenantId: tenant.id,
        provider: 'IYZICO',
        mode: 'TEST',
        apiKey: 'demo-api-key',
        secretKey: 'demo-secret-key',
        merchantName: 'Demo Yönetim',
        isActive: true,
      },
    })
  }

  const site1Units: { id: string }[] = []
  const unitData = [
    { number: '1', floor: 1 }, { number: '2', floor: 1 },
    { number: '3', floor: 2 }, { number: '4', floor: 2 },
    { number: '5', floor: 3 }, { number: '6', floor: 3 },
    { number: '7', floor: 4 }, { number: '8', floor: 4 },
  ]

  for (const u of unitData) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await prisma.unit.findFirst({
      where: { tenantId: tenant.id, siteId: site1.id, blockId: null, number: u.number },
    })

    // eslint-disable-next-line no-await-in-loop
    const unit = existing ?? await prisma.unit.create({
      data: {
        tenantId: tenant.id,
        siteId: site1.id,
        number: u.number,
        floor: u.floor,
        type: 'APARTMENT',
        area: 90,
      },
    })

    site1Units.push(unit)
  }

  const residentData = [
    { unitIdx: 0, firstName: 'Ahmet', lastName: 'Yılmaz', phone: '05301234567', type: 'OWNER' as const },
    { unitIdx: 1, firstName: 'Fatma', lastName: 'Kaya', phone: '05312345678', type: 'TENANT' as const },
    { unitIdx: 2, firstName: 'Mehmet', lastName: 'Demir', phone: '05323456789', type: 'OWNER' as const },
    { unitIdx: 3, firstName: 'Ayşe', lastName: 'Çelik', phone: '05334567890', type: 'OWNER' as const },
    { unitIdx: 4, firstName: 'Mustafa', lastName: 'Şahin', phone: '05345678901', type: 'TENANT' as const },
    { unitIdx: 5, firstName: 'Zeynep', lastName: 'Arslan', phone: '05356789012', type: 'OWNER' as const },
    { unitIdx: 6, firstName: 'İbrahim', lastName: 'Koç', phone: '05367890123', type: 'TENANT' as const },
    { unitIdx: 7, firstName: 'Hatice', lastName: 'Aydın', phone: '05378901234', type: 'OWNER' as const },
  ]

  for (const row of residentData) {
    const unit = site1Units[row.unitIdx]!

    // eslint-disable-next-line no-await-in-loop
    const resident = await prisma.resident.findFirst({
      where: {
        tenantId: tenant.id,
        phoneNumber: row.phone,
      },
    })

    // eslint-disable-next-line no-await-in-loop
    const residentRecord = resident ?? await prisma.resident.create({
      data: {
        tenantId: tenant.id,
        firstName: row.firstName,
        lastName: row.lastName,
        phoneNumber: row.phone,
        type: row.type,
      },
    })

    // eslint-disable-next-line no-await-in-loop
    const occupancy = await prisma.unitOccupancy.findFirst({
      where: {
        tenantId: tenant.id,
        unitId: unit.id,
        residentId: residentRecord.id,
        isActive: true,
      },
    })

    if (!occupancy) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.unitOccupancy.create({
        data: {
          tenantId: tenant.id,
          unitId: unit.id,
          residentId: residentRecord.id,
          role: row.type === 'OWNER' ? 'OWNER' : 'TENANT',
          isPrimaryResponsible: true,
          startDate: new Date(new Date().getFullYear(), 0, 1),
          isActive: true,
          createdByUserId: adminUser.id,
        },
      })
    }
  }

  const periods: { month: number; year: number }[] = []
  const now = new Date()
  for (let i = 2; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    periods.push({ month: d.getMonth() + 1, year: d.getFullYear() })
  }

  for (const period of periods) {
    for (let idx = 0; idx < site1Units.length; idx += 1) {
      const unit = site1Units[idx]!
      const dueDate = new Date(period.year, period.month - 1, 10)

      // eslint-disable-next-line no-await-in-loop
      let dues = await prisma.dues.findUnique({
        where: {
          unitId_periodMonth_periodYear: {
            unitId: unit.id,
            periodMonth: period.month,
            periodYear: period.year,
          },
        },
      })

      if (!dues) {
        // eslint-disable-next-line no-await-in-loop
        dues = await prisma.dues.create({
          data: {
            tenantId: tenant.id,
            unitId: unit.id,
            amount: 500,
            currency: 'TRY',
            status: DuesStatus.PENDING,
            dueDate,
            periodMonth: period.month,
            periodYear: period.year,
            description: `${period.month}/${period.year} dönemi aidatı`,
          },
        })
      }

      // eslint-disable-next-line no-await-in-loop
      await ensureLedgerEntry({
        tenantId: tenant.id,
        unitId: unit.id,
        amount: 500,
        entryType: LedgerEntryType.CHARGE,
        referenceType: LedgerReferenceType.DUES,
        referenceId: dues.id,
        idempotencyKey: `dues-charge-${dues.id}`,
        effectiveAt: dueDate,
        note: dues.description ?? undefined,
        createdByUserId: adminUser.id,
      })

      const shouldBePaid = dueDate < now && idx < 5

      if (shouldBePaid) {
        // eslint-disable-next-line no-await-in-loop
        const existingPayment = await prisma.payment.findFirst({
          where: {
            tenantId: tenant.id,
            duesId: dues.id,
            status: PaymentStatus.CONFIRMED,
          },
        })

        if (!existingPayment) {
          // eslint-disable-next-line no-await-in-loop
          const payment = await prisma.payment.create({
            data: {
              tenantId: tenant.id,
              unitId: unit.id,
              duesId: dues.id,
              amount: 500,
              currency: 'TRY',
              method: PaymentMethod.CASH,
              channel: PaymentChannel.STAFF_PANEL,
              provider: PaymentProvider.MANUAL,
              status: PaymentStatus.CONFIRMED,
              paidByUserId: adminUser.id,
              approvedByUserId: adminUser.id,
              paidAt: dueDate,
              confirmedAt: dueDate,
              note: 'Seed tahsilatı',
            },
          })

          // eslint-disable-next-line no-await-in-loop
          await ensureLedgerEntry({
            tenantId: tenant.id,
            unitId: unit.id,
            amount: -500,
            entryType: LedgerEntryType.PAYMENT,
            referenceType: LedgerReferenceType.PAYMENT,
            referenceId: payment.id,
            idempotencyKey: `payment-confirmed-${payment.id}`,
            effectiveAt: dueDate,
            note: 'Seed tahsilatı',
            createdByUserId: adminUser.id,
          })
        }
      }

      // eslint-disable-next-line no-await-in-loop
      const paidAmount = await prisma.payment.aggregate({
        where: {
          tenantId: tenant.id,
          duesId: dues.id,
          status: PaymentStatus.CONFIRMED,
        },
        _sum: { amount: true },
      })

      const paid = Number(paidAmount._sum.amount ?? 0)
      const status =
        paid >= Number(dues.amount)
          ? DuesStatus.PAID
          : paid > 0
            ? DuesStatus.PARTIALLY_PAID
            : dueDate < now
              ? DuesStatus.OVERDUE
              : DuesStatus.PENDING

      // eslint-disable-next-line no-await-in-loop
      await prisma.dues.update({
        where: { id: dues.id },
        data: { status },
      })
    }
  }

  await prisma.tenantPlan.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      planType: 'TRIAL',
      smsCredits: 50,
      maxUnits: 100,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  const existingAnnouncement = await prisma.announcement.findFirst({
    where: { tenantId: tenant.id },
  })
  if (!existingAnnouncement) {
    await prisma.announcement.create({
      data: {
        tenantId: tenant.id,
        siteId: site1.id,
        title: 'Su Kesintisi Duyurusu',
        body: 'Yarın 09:00-12:00 saatleri arasında planlı su kesintisi yapılacaktır.',
        publishedAt: new Date(),
        createdById: adminUser.id,
      },
    })
  }

  console.log('\n────────────────────────────────────────')
  console.log('Seed tamamlandi!')
  console.log(`TENANT_ADMIN bypass: x-dev-tenant-id: ${tenant.id}`)
  console.log('SUPER_ADMIN bypass:   x-dev-tenant-id: super')
  console.log('────────────────────────────────────────\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
