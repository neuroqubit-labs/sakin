import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed başlatılıyor...')

  // Demo Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-yonetim' },
    update: {},
    create: {
      name: 'Demo Yönetim A.Ş.',
      slug: 'demo-yonetim',
      contactEmail: 'admin@demo-yonetim.com',
      contactPhone: '05321234567',
      city: 'Kayseri',
      address: 'Kocasinan İlçesi, Demo Mah. No:1',
    },
  })
  console.log(`✅ Tenant: ${tenant.name}`)

  // Demo Site
  const site = await prisma.site.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Güneş Apartmanı' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Güneş Apartmanı',
      address: 'Demo Mahallesi, Güneş Sokak No:5',
      city: 'Kayseri',
      district: 'Kocasinan',
      totalUnits: 8,
      hasBlocks: false,
    },
  })
  console.log(`✅ Site: ${site.name}`)

  // Demo Units (1-8 arası daireler)
  const unitNumbers = ['1', '2', '3', '4', '5', '6', '7', '8']
  const floors = [1, 1, 2, 2, 3, 3, 4, 4]

  for (let i = 0; i < unitNumbers.length; i++) {
    const number = unitNumbers[i]!
    const floor = floors[i]!

    await prisma.unit.upsert({
      where: {
        siteId_blockId_number: {
          siteId: site.id,
          blockId: null as unknown as string,
          number,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        siteId: site.id,
        number,
        floor,
        type: 'APARTMENT',
        area: 90,
      },
    })
  }
  console.log(`✅ ${unitNumbers.length} daire oluşturuldu`)

  console.log('🎉 Seed tamamlandı!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
