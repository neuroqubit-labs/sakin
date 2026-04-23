import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { randomInt } from 'node:crypto'
import { PrismaService } from '../../prisma/prisma.service'
import { SmsService } from '../../common/sms/sms.service'
import { PlatformAuditLogService } from '../platform/audit-log.service'
import type { LoginDto, OtpRequestDto, OtpVerifyDto, RegisterDto, RefreshTokenDto } from '@sakin/shared'
import { PaymentStatus, UserRole } from '@sakin/shared'

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-jwt-secret-change-me-in-production'
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] ?? 'dev-jwt-refresh-secret-change-me'
const ACCESS_EXPIRES_IN = '15m'
const REFRESH_EXPIRES_IN = '7d'

const OTP_TTL_MS = 5 * 60 * 1000
const OTP_MAX_ATTEMPTS = 3
const OTP_REQUEST_WINDOW_MS = 60 * 1000
const OTP_RETURN_IN_RESPONSE = process.env['NODE_ENV'] !== 'production'

interface JwtPayload {
  sub: string
  email: string
}

/**
 * Telefon numarasını karşılaştırılabilir forma çevirir.
 * "+90 555 123 45 67" → "+905551234567"; başında + yoksa ve 11 haneli 0-ile başlıyorsa "+9" ile normalize eder.
 */
function normalizePhone(raw: string): string {
  const trimmed = raw.replace(/\s+/g, '').replace(/[()-]/g, '')
  if (trimmed.startsWith('+')) return trimmed
  if (trimmed.startsWith('00')) return '+' + trimmed.slice(2)
  if (trimmed.startsWith('0') && trimmed.length === 11) return '+9' + trimmed
  if (trimmed.length === 10) return '+90' + trimmed
  return '+' + trimmed
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly auditLog: PlatformAuditLogService,
  ) {}

  private readonly allowedRegisterRoles = new Set<UserRole>([UserRole.RESIDENT])

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

  async login(dto: LoginDto, meta: { ipAddress?: string | null; userAgent?: string | null } = {}) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, displayName: true, passwordHash: true, isActive: true },
    })

    const recordFailure = (reason: string) => {
      this.auditLog
        .write({
          actorUserId: user?.id ?? 'unknown',
          tenantId: null,
          action: 'LOGIN_FAILED',
          entity: 'Auth',
          entityId: dto.email,
          changes: { email: dto.email, reason },
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
        })
        .catch((err) => this.logger.warn(`LOGIN_FAILED log error: ${err instanceof Error ? err.message : err}`))
    }

    if (!user || !user.passwordHash) {
      recordFailure('unknown_user_or_no_password')
      throw new UnauthorizedException('E-posta veya şifre hatalı')
    }

    if (!user.isActive) {
      recordFailure('inactive')
      throw new UnauthorizedException('Hesabınız devre dışı bırakılmıştır')
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) {
      recordFailure('wrong_password')
      throw new UnauthorizedException('E-posta veya şifre hatalı')
    }

    const tokens = this.generateTokens(user.id, user.email!)

    await this.auditLog
      .write({
        actorUserId: user.id,
        tenantId: null,
        action: 'LOGIN_SUCCESS',
        entity: 'Auth',
        entityId: user.id,
        changes: { email: user.email },
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      })
      .catch((err) => this.logger.warn(`LOGIN_SUCCESS log error: ${err instanceof Error ? err.message : err}`))

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

  async requestOtp(dto: OtpRequestDto) {
    const phone = normalizePhone(dto.phoneNumber)

    const resident = await this.findResidentByPhone(phone)
    if (!resident) {
      throw new NotFoundException('Bu telefon numarası kayıtlı değil. Lütfen yöneticinizle iletişime geçin.')
    }

    // Rate-limit: son 60 saniyede istek varsa reddet.
    const recent = await this.prisma.otpCode.findFirst({
      where: {
        phoneNumber: phone,
        createdAt: { gt: new Date(Date.now() - OTP_REQUEST_WINDOW_MS) },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    if (recent) {
      const waitSeconds = Math.ceil(
        (OTP_REQUEST_WINDOW_MS - (Date.now() - recent.createdAt.getTime())) / 1000,
      )
      throw new BadRequestException(`Yeni kod için ${waitSeconds} saniye bekleyin.`)
    }

    // Tüketilmemiş eski kodları geçersiz kıl (tek-aktif-kod garantisi).
    await this.prisma.otpCode.updateMany({
      where: { phoneNumber: phone, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    })

    const code = randomInt(100000, 1000000).toString()
    const codeHash = await bcrypt.hash(code, 10)

    await this.prisma.otpCode.create({
      data: {
        phoneNumber: phone,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    })

    // SmsService mock sürücüsünde sessizce logla; gerçek sürücüde API çağrısı yapar.
    // Hata olursa OTP kaydı zaten yazıldı — kullanıcı "yeni kod iste" diyebilir.
    try {
      await this.sms.sendOtp(phone, code)
    } catch (error) {
      this.logger.warn(
        `OTP SMS gönderilemedi (phone=${phone}): ${(error as Error).message}`,
      )
      // Mock dışında sürücü varsa ve gönderim başarısızsa 500 fırlat (kullanıcı tekrar denesin).
      if (this.sms.driverName !== 'mock') {
        throw new BadRequestException('SMS gönderilemedi. Biraz sonra tekrar deneyin.')
      }
    }

    // Dev bypass: sadece mock sürücüde ve NODE_ENV !== production ise kodu response'ta döndür.
    // Bu sayede Netgsm/İletimerkezi bağlandığında devCode otomatik olarak gizlenir.
    if (OTP_RETURN_IN_RESPONSE && this.sms.driverName === 'mock') {
      return { ok: true, phoneNumber: phone, devCode: code }
    }
    return { ok: true, phoneNumber: phone }
  }

  async verifyOtp(dto: OtpVerifyDto) {
    const phone = normalizePhone(dto.phoneNumber)

    const otp = await this.prisma.otpCode.findFirst({
      where: { phoneNumber: phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    if (!otp) {
      throw new UnauthorizedException('Kod bulunamadı. Yeni kod isteyin.')
    }

    if (otp.expiresAt.getTime() < Date.now()) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() },
      })
      throw new UnauthorizedException('Kod süresi doldu. Yeni kod isteyin.')
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() },
      })
      throw new UnauthorizedException('Çok fazla hatalı deneme. Yeni kod isteyin.')
    }

    const valid = await bcrypt.compare(dto.code, otp.codeHash)
    if (!valid) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      })
      throw new UnauthorizedException('Kod hatalı.')
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    })

    // Telefondan resident bul, User'ı yoksa oluştur, yoksa bağla.
    const resident = await this.findResidentByPhone(phone)
    if (!resident) {
      throw new NotFoundException('Bu telefon numarasına ait aktif kayıt bulunamadı.')
    }

    let userId = resident.userId
    if (!userId) {
      // Aynı phoneNumber ile User var mı? (başka tenant'ta daire sahibi olabilir)
      const existingUser = await this.prisma.user.findFirst({
        where: { phoneNumber: phone, isActive: true },
        select: { id: true },
      })

      if (existingUser) {
        userId = existingUser.id
      } else {
        const displayName = `${resident.firstName} ${resident.lastName}`.trim()
        const newUser = await this.prisma.user.create({
          data: {
            phoneNumber: phone,
            displayName: displayName || null,
          },
          select: { id: true },
        })
        userId = newUser.id
      }

      // Aynı telefona bağlı tüm resident kayıtlarını bu user'a bağla.
      const linkedResidents = await this.prisma.resident.findMany({
        where: { phoneNumber: resident.phoneNumber, userId: null, isActive: true },
        select: { id: true },
      })
      const linkedResidentIds = linkedResidents.map((r) => r.id)

      await this.prisma.resident.updateMany({
        where: { id: { in: linkedResidentIds } },
        data: { userId },
      })

      // Duyuru broadcast'ları user yokken yazılmış olabilir; bu kullanıcıya backfill et.
      if (linkedResidentIds.length > 0) {
        await this.prisma.notification.updateMany({
          where: { residentId: { in: linkedResidentIds }, userId: null },
          data: { userId },
        })
      }
    }

    // UserTenantRole: RESIDENT rolü yoksa yarat. Her tenant için ayrı kayıt.
    const residencies = await this.prisma.resident.findMany({
      where: { userId, isActive: true },
      select: { tenantId: true },
      distinct: ['tenantId'],
    })

    for (const row of residencies) {
      await this.prisma.userTenantRole.upsert({
        where: { userId_tenantId: { userId, tenantId: row.tenantId } },
        create: { userId, tenantId: row.tenantId, role: UserRole.RESIDENT },
        update: { isActive: true, role: UserRole.RESIDENT },
      })
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, phoneNumber: true, displayName: true },
    })

    const tokens = this.generateTokens(user.id, user.email ?? user.phoneNumber ?? '')
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
      },
    }
  }

  /**
   * Kayıtlı telefonla resident ara. Tam eşleşme yoksa normalized karşılaştır.
   */
  private async findResidentByPhone(normalizedPhone: string) {
    // Önce tam eşleşme
    const direct = await this.prisma.resident.findFirst({
      where: { phoneNumber: normalizedPhone, isActive: true },
      select: { id: true, tenantId: true, userId: true, firstName: true, lastName: true, phoneNumber: true },
    })
    if (direct) return direct

    // Olası formatlar (veritabanında "+90..." olmayan kayıtlar için):
    // normalizedPhone +905551234567 ise "05551234567" veya "5551234567" denemeleri.
    const candidates: string[] = []
    if (normalizedPhone.startsWith('+90')) {
      const rest = normalizedPhone.slice(3)
      candidates.push('0' + rest, rest)
    }

    if (candidates.length === 0) return null

    return this.prisma.resident.findFirst({
      where: { phoneNumber: { in: candidates }, isActive: true },
      select: { id: true, tenantId: true, userId: true, firstName: true, lastName: true, phoneNumber: true },
    })
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
