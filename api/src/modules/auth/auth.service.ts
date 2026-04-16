import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { PrismaService } from '../../prisma/prisma.service'
import type { LoginDto, RegisterDto, RefreshTokenDto } from '@sakin/shared'
import { PaymentStatus, UserRole } from '@sakin/shared'

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-jwt-secret-change-me-in-production'
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] ?? 'dev-jwt-refresh-secret-change-me'
const ACCESS_EXPIRES_IN = '15m'
const REFRESH_EXPIRES_IN = '7d'

interface JwtPayload {
  sub: string
  email: string
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly allowedRegisterRoles = new Set<UserRole>([UserRole.RESIDENT, UserRole.STAFF])

  private generateTokens(userId: string, email: string) {
    const accessToken = jwt.sign({ sub: userId, email } satisfies JwtPayload, JWT_SECRET, {
      expiresIn: ACCESS_EXPIRES_IN,
    })
    const refreshToken = jwt.sign({ sub: userId, type: 'refresh' }, JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_EXPIRES_IN,
    })
    return { accessToken, refreshToken }
  }

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, displayName: true, passwordHash: true, isActive: true },
    })

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('E-posta veya şifre hatalı')
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Hesabınız devre dışı bırakılmıştır')
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) {
      throw new UnauthorizedException('E-posta veya şifre hatalı')
    }

    const tokens = this.generateTokens(user.id, user.email!)
    return {
      ...tokens,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    }
  }

  async refresh(dto: RefreshTokenDto) {
    let decoded: { sub: string; type: string }
    try {
      decoded = jwt.verify(dto.refreshToken, JWT_REFRESH_SECRET) as { sub: string; type: string }
    } catch {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş refresh token')
    }

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException('Geçersiz token türü')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, displayName: true, isActive: true },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Kullanıcı bulunamadı veya devre dışı')
    }

    const tokens = this.generateTokens(user.id, user.email ?? '')
    return {
      ...tokens,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    }
  }

  async register(dto: RegisterDto) {
    const requestedRole = dto.role ?? UserRole.RESIDENT

    if (!this.allowedRegisterRoles.has(requestedRole)) {
      throw new BadRequestException('Register üzerinden bu rol atanamaz')
    }

    if (requestedRole === UserRole.STAFF && !dto.tenantId) {
      throw new BadRequestException('STAFF kaydı için tenantId zorunludur')
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })

    if (existingUser) {
      throw new BadRequestException('Bu e-posta adresi zaten kayıtlı')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        passwordHash,
      },
    })

    await this.prisma.userTenantRole.create({
      data: {
        userId: user.id,
        tenantId: dto.tenantId ?? null,
        role: requestedRole,
      },
    })

    const tokens = this.generateTokens(user.id, user.email!)
    return {
      ...tokens,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    }
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

  async getResidencies(userId: string, tenantId: string | null, residentId?: string | null) {
    if (!tenantId) return { data: [] }

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
