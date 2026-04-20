import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { FileStorageService } from '../../common/storage/file-storage.service'
import {
  TICKET_ATTACHMENT_MAX_BYTES,
  TICKET_ATTACHMENT_MAX_PER_TICKET,
  UserRole,
  type UploadTicketAttachmentDto,
} from '@sakin/shared'

interface Scope {
  role: UserRole
  userId?: string
}

@Injectable()
export class TicketAttachmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: FileStorageService,
  ) {}

  async upload(ticketId: string, dto: UploadTicketAttachmentDto, tenantId: string, scope: Scope) {
    const db = this.prisma.forTenant(tenantId)
    if (!scope.userId) throw new ForbiddenException('Kullanıcı kimliği yok')

    const ticket = await db.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
      select: { id: true, reportedById: true },
    })
    if (!ticket) throw new NotFoundException('Talep bulunamadı')

    // RESIDENT sadece kendi açtığı taleplere foto yükleyebilir.
    if (scope.role === UserRole.RESIDENT && ticket.reportedById !== scope.userId) {
      throw new ForbiddenException('Bu talebe ek ekleyemezsiniz')
    }

    const count = await db.ticketAttachment.count({ where: { ticketId } })
    if (count >= TICKET_ATTACHMENT_MAX_PER_TICKET) {
      throw new BadRequestException(
        `Bir talebe en fazla ${TICKET_ATTACHMENT_MAX_PER_TICKET} fotoğraf ekleyebilirsiniz`,
      )
    }

    const buffer = decodeBase64(dto.data)
    if (buffer.byteLength > TICKET_ATTACHMENT_MAX_BYTES) {
      throw new PayloadTooLargeException(
        `Dosya en fazla ${Math.floor(TICKET_ATTACHMENT_MAX_BYTES / (1024 * 1024))} MB olabilir`,
      )
    }

    const stored = await this.storage.put({
      namespace: `tenants/${tenantId}/tickets/${ticketId}`,
      buffer,
      mimeType: dto.mimeType,
      originalName: dto.originalName ?? null,
    })

    const created = await db.ticketAttachment.create({
      data: {
        tenantId,
        ticketId,
        uploadedById: scope.userId,
        storageKey: stored.storageKey,
        storageDriver: stored.driver,
        mimeType: dto.mimeType,
        sizeBytes: buffer.byteLength,
        originalName: dto.originalName ?? null,
      },
      select: {
        id: true,
        mimeType: true,
        sizeBytes: true,
        originalName: true,
        createdAt: true,
      },
    })

    return {
      ...created,
      downloadUrl: this.buildDownloadUrl(created.id),
    }
  }

  async list(ticketId: string, tenantId: string, scope: Scope) {
    const db = this.prisma.forTenant(tenantId)
    const ticket = await db.ticket.findFirst({
      where: { id: ticketId, deletedAt: null },
      select: { id: true, reportedById: true },
    })
    if (!ticket) throw new NotFoundException('Talep bulunamadı')
    if (scope.role === UserRole.RESIDENT && ticket.reportedById !== scope.userId) {
      throw new ForbiddenException('Bu talebi görüntüleme yetkiniz yok')
    }

    const attachments = await db.ticketAttachment.findMany({
      where: { ticketId },
      select: {
        id: true,
        mimeType: true,
        sizeBytes: true,
        originalName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return attachments.map((att) => ({
      ...att,
      downloadUrl: this.buildDownloadUrl(att.id),
    }))
  }

  async download(attachmentId: string, tenantId: string, scope: Scope) {
    const db = this.prisma.forTenant(tenantId)
    const att = await db.ticketAttachment.findFirst({
      where: { id: attachmentId },
      select: {
        id: true,
        storageKey: true,
        mimeType: true,
        originalName: true,
        ticket: { select: { reportedById: true, deletedAt: true } },
      },
    })
    if (!att || att.ticket?.deletedAt) throw new NotFoundException('Ek bulunamadı')
    if (scope.role === UserRole.RESIDENT && att.ticket?.reportedById !== scope.userId) {
      throw new ForbiddenException('Bu eki görüntüleyemezsiniz')
    }

    const { buffer } = await this.storage.readBuffer(att.storageKey)
    return { buffer, mimeType: att.mimeType, filename: att.originalName ?? `${att.id}` }
  }

  async delete(attachmentId: string, tenantId: string, scope: Scope) {
    const db = this.prisma.forTenant(tenantId)
    const att = await db.ticketAttachment.findFirst({
      where: { id: attachmentId },
      select: {
        id: true,
        storageKey: true,
        uploadedById: true,
        ticket: { select: { reportedById: true } },
      },
    })
    if (!att) throw new NotFoundException('Ek bulunamadı')
    if (scope.role === UserRole.RESIDENT && att.uploadedById !== scope.userId) {
      throw new ForbiddenException('Bu eki silemezsiniz')
    }

    await db.ticketAttachment.delete({ where: { id: attachmentId } })
    await this.storage.delete(att.storageKey)
    return { id: attachmentId }
  }

  private buildDownloadUrl(attachmentId: string): string {
    // Tenant middleware X-Tenant-Id header'ı bekliyor; mobil tarafı zaten apiClient üzerinden çağırıyor.
    return `/tickets/attachments/${attachmentId}/download`
  }
}

function decodeBase64(raw: string): Buffer {
  const payload = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw
  try {
    return Buffer.from(payload, 'base64')
  } catch {
    throw new BadRequestException('Geçersiz base64 gövdesi')
  }
}
