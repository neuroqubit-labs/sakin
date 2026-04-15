import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import * as admin from 'firebase-admin'
import { PrismaService } from '../../prisma/prisma.service'
import type { RegisterDto } from '@sakin/shared'
import { PaymentStatus, UserRole } from '@sakin/shared'

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly allowedRegisterRoles = new Set<UserRole>([UserRole.RESIDENT, UserRole.STAFF])

  /**
   * Firebase token ile kullanıcıyı doğrular ve kullanıcı + tenant rol ilişkisi oluşturur.
   */
  async register(dto: RegisterDto) {
    let decoded: admin.auth.DecodedIdToken

    try {
      decoded = await admin.auth().verifyIdToken(dto.firebaseToken)
    } catch {
      throw new UnauthorizedException('Geçersiz Firebase token')
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    })

    const requestedRole = dto.role ?? UserRole.RESIDENT

    if (!this.allowedRegisterRoles.has(requestedRole)) {
      throw new BadRequestException('Register üzerinden bu rol atanamaz')
    }

    if (requestedRole === UserRole.STAFF && !dto.tenantId) {
      throw new BadRequestException('STAFF kaydı için tenantId zorunludur')
    }

    if (existingUser) {
      if (dto.tenantId !== undefined) {
        if (dto.tenantId) {
          await this.prisma.userTenantRole.upsert({
            where: {
              userId_tenantId: {
                userId: existingUser.id,
                tenantId: dto.tenantId,
              },
            },
            update: {
              role: requestedRole,
              isActive: true,
            },
            create: {
              userId: existingUser.id,
              tenantId: dto.tenantId,
              role: requestedRole,
              isActive: true,
            },
          })
        } else {
          const existingGlobalRole = await this.prisma.userTenantRole.findFirst({
            where: { userId: existingUser.id, tenantId: null },
            select: { id: true },
          })

          if (existingGlobalRole) {
            await this.prisma.userTenantRole.update({
              where: { id: existingGlobalRole.id },
              data: {
                role: requestedRole,
                isActive: true,
              },
            })
          } else {
            await this.prisma.userTenantRole.create({
              data: {
                userId: existingUser.id,
                tenantId: null,
                role: requestedRole,
                isActive: true,
              },
            })
          }
        }
      }

      return { userId: existingUser.id, tenantId: dto.tenantId ?? null, role: requestedRole }
    }

    const user = await this.prisma.user.create({
      data: {
        firebaseUid: decoded.uid,
        email: decoded.email,
        phoneNumber: decoded.phone_number,
        displayName: dto.displayName ?? decoded.name,
      },
    })

    await this.prisma.userTenantRole.create({
      data: {
        userId: user.id,
        tenantId: dto.tenantId ?? null,
        role: requestedRole,
      },
    })

    return { userId: user.id, tenantId: dto.tenantId ?? null, role: requestedRole }
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        displayName: true,
        createdAt: true,
        tenantRoles: {
          where: { isActive: true },
          select: {
            id: true,
            tenantId: true,
            role: true,
          },
        },
      },
    })
  }

  /**
   * Kullanıcının aktif ünite(ler)ini döner — mobilin "daire seçici" ve
   * resident↔tenant↔unit köprüsü için kullanılır. Tek kullanıcı birden fazla
   * daireden sorumlu olabileceği için array döner.
   */
  async getResidencies(userId: string, tenantId: string | null, residentId?: string | null) {
    if (!tenantId) return { data: [] }

    // Dev bypass: residentId doğrudan verilmişse kullan, yoksa userId üzerinden bul
    let resident: { id: string } | null = null
    if (residentId) {
      resident = await this.prisma.resident.findFirst({
        where: { id: residentId, tenantId, isActive: true },
        select: { id: true },
      })
    } else {
      resident = await this.prisma.resident.findFirst({
        where: { userId, tenantId, isActive: true },
        select: { id: true },
      })
    }
    if (!resident) return { data: [] }

    const occupancies = await this.prisma.unitOccupancy.findMany({
      where: { residentId: resident.id, tenantId, isActive: true },
      orderBy: [{ isPrimaryResponsible: 'desc' }, { startDate: 'desc' }],
      select: {
        id: true,
        role: true,
        isPrimaryResponsible: true,
        startDate: true,
        unit: {
          select: {
            id: true,
            number: true,
            floor: true,
            site: { select: { id: true, name: true } },
            block: { select: { id: true, name: true } },
          },
        },
      },
    })

    return {
      data: occupancies.map((o) => ({
        occupancyId: o.id,
        occupancyRole: o.role,
        isPrimaryResponsible: o.isPrimaryResponsible,
        startDate: o.startDate,
        unitId: o.unit.id,
        unitNumber: o.unit.number,
        floor: o.unit.floor,
        siteId: o.unit.site.id,
        siteName: o.unit.site.name,
        blockId: o.unit.block?.id ?? null,
        blockName: o.unit.block?.name ?? null,
      })),
    }
  }

  async getDevBootstrap() {
    if (process.env['NODE_ENV'] === 'production') {
      throw new ForbiddenException('Bu endpoint yalnızca development modunda kullanılabilir')
    }

    const tenant =
      await this.prisma.tenant.findUnique({
        where: { slug: 'demo-yonetim' },
        select: { id: true, name: true, slug: true, isActive: true },
      }) ??
      await this.prisma.tenant.findFirst({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, isActive: true },
        orderBy: { createdAt: 'asc' },
      })

    if (!tenant) {
      return {
        ready: false,
        message: 'Aktif tenant bulunamadı. Önce seed çalıştırın.',
      }
    }

    const [siteCount, unitCount, residentCount, duesCount, paymentCount, firstResident] = await Promise.all([
      this.prisma.site.count({ where: { tenantId: tenant.id, isActive: true } }),
      this.prisma.unit.count({ where: { tenantId: tenant.id, isActive: true } }),
      this.prisma.unitOccupancy.count({ where: { tenantId: tenant.id, isActive: true } }),
      this.prisma.dues.count({ where: { tenantId: tenant.id } }),
      this.prisma.payment.count({ where: { tenantId: tenant.id, status: PaymentStatus.CONFIRMED } }),
      this.prisma.unitOccupancy.findFirst({
        where: { tenantId: tenant.id, isActive: true },
        select: {
          id: true,
          role: true,
          resident: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
          unit: {
            select: {
              id: true,
              number: true,
              site: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    return {
      ready: true,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      stats: {
        siteCount,
        unitCount,
        residentCount,
        duesCount,
        paymentCount,
      },
      quickRoles: [UserRole.STAFF, UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN],
      devResident: firstResident ? {
        residentId: firstResident.resident.id,
        name: `${firstResident.resident.firstName} ${firstResident.resident.lastName}`,
        phone: firstResident.resident.phoneNumber,
        unitId: firstResident.unit.id,
        unitNumber: firstResident.unit.number,
        siteName: firstResident.unit.site.name,
      } : null,
    }
  }
}
