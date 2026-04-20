import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export type StorageDriverName = 'local' | 's3'

export interface PutObjectInput {
  /** Mantıksal konum ('tickets', 'receipts', …). Sürücü buna göre key üretir. */
  namespace: string
  buffer: Buffer
  mimeType: string
  originalName?: string | null
}

export interface PutObjectResult {
  storageKey: string
  driver: StorageDriverName
}

export interface StorageDriver {
  readonly name: StorageDriverName
  put(input: PutObjectInput): Promise<PutObjectResult>
  getSignedUrl(storageKey: string, expiresInSeconds: number): Promise<string>
  readBuffer(storageKey: string): Promise<{ buffer: Buffer; mimeType: string | null }>
  delete(storageKey: string): Promise<void>
}

/**
 * Yerel disk sürücüsü. Dev ve test ortamında kullanılır.
 * storageKey formatı: `local://<namespace>/<uuid>-<safeName>`
 * Dosyalar `STORAGE_LOCAL_DIR` (varsayılan: `./storage`) altında saklanır.
 */
class LocalDiskDriver implements StorageDriver {
  readonly name: StorageDriverName = 'local'
  private readonly logger = new Logger('LocalDiskStorage')
  private readonly rootDir: string
  private readonly publicBaseUrl: string | null

  constructor() {
    this.rootDir = resolve(process.env['STORAGE_LOCAL_DIR'] ?? './storage')
    if (!existsSync(this.rootDir)) {
      mkdirSync(this.rootDir, { recursive: true })
    }
    // Dev modunda API üzerinden serve edeceğiz; env ile override edilebilir.
    this.publicBaseUrl = process.env['STORAGE_LOCAL_PUBLIC_BASE_URL'] ?? null
  }

  async put(input: PutObjectInput): Promise<PutObjectResult> {
    const namespaceDir = join(this.rootDir, input.namespace)
    if (!existsSync(namespaceDir)) mkdirSync(namespaceDir, { recursive: true })

    const safeName = sanitizeFileName(input.originalName ?? 'file')
    const fileName = `${randomUUID()}-${safeName}`
    const absolutePath = join(namespaceDir, fileName)
    await writeFile(absolutePath, input.buffer)

    return {
      driver: this.name,
      storageKey: `local://${input.namespace}/${fileName}`,
    }
  }

  async getSignedUrl(storageKey: string, _expiresInSeconds: number): Promise<string> {
    // Yerel sürücüde signed URL yok; API kendi endpoint'i üzerinden serve eder.
    // Controller `/tickets/attachments/:id/download` rotasını döner.
    if (this.publicBaseUrl) {
      const relative = this.resolveRelativePath(storageKey)
      return `${this.publicBaseUrl.replace(/\/$/, '')}/${relative}`
    }
    return `storage://${storageKey}`
  }

  async readBuffer(storageKey: string): Promise<{ buffer: Buffer; mimeType: string | null }> {
    const absolute = this.resolveAbsolutePath(storageKey)
    const buffer = await readFile(absolute)
    return { buffer, mimeType: null }
  }

  async delete(storageKey: string): Promise<void> {
    try {
      const absolute = this.resolveAbsolutePath(storageKey)
      await unlink(absolute)
    } catch (error) {
      this.logger.warn(`delete failed for ${storageKey}: ${(error as Error).message}`)
    }
  }

  private resolveRelativePath(storageKey: string): string {
    if (!storageKey.startsWith('local://')) {
      throw new InternalServerErrorException('Geçersiz storageKey')
    }
    return storageKey.slice('local://'.length)
  }

  private resolveAbsolutePath(storageKey: string): string {
    return join(this.rootDir, this.resolveRelativePath(storageKey))
  }
}

/**
 * S3 sürücüsü — şu an bağlantısız stub.
 * Bucket, credential ve SDK eklendiğinde bu metodlar gerçek S3 çağrılarına dönecek.
 * Şu haliyle `PUT /tickets/:id/attachments` S3 driver seçiliyse `NotImplemented` atar.
 */
class S3Driver implements StorageDriver {
  readonly name: StorageDriverName = 's3'

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async put(_input: PutObjectInput): Promise<PutObjectResult> {
    throw new InternalServerErrorException(
      'S3 sürücüsü henüz aktif değil. STORAGE_DRIVER=local ile çalışın ya da AWS entegrasyonunu etkinleştirin.',
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getSignedUrl(_storageKey: string, _expiresInSeconds: number): Promise<string> {
    throw new InternalServerErrorException('S3 signed URL üretimi henüz bağlanmadı')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async readBuffer(_storageKey: string): Promise<{ buffer: Buffer; mimeType: string | null }> {
    throw new InternalServerErrorException('S3 okuma henüz bağlanmadı')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(_storageKey: string): Promise<void> {
    throw new InternalServerErrorException('S3 silme henüz bağlanmadı')
  }
}

@Injectable()
export class FileStorageService {
  private readonly driver: StorageDriver

  constructor() {
    const driverName = (process.env['STORAGE_DRIVER'] ?? 'local').toLowerCase() as StorageDriverName
    this.driver = driverName === 's3' ? new S3Driver() : new LocalDiskDriver()
  }

  get driverName(): StorageDriverName {
    return this.driver.name
  }

  put(input: PutObjectInput): Promise<PutObjectResult> {
    return this.driver.put(input)
  }

  getSignedUrl(storageKey: string, expiresInSeconds = 300): Promise<string> {
    return this.driver.getSignedUrl(storageKey, expiresInSeconds)
  }

  readBuffer(storageKey: string): Promise<{ buffer: Buffer; mimeType: string | null }> {
    return this.driver.readBuffer(storageKey)
  }

  delete(storageKey: string): Promise<void> {
    return this.driver.delete(storageKey)
  }
}

function sanitizeFileName(input: string): string {
  const trimmed = input.trim().replace(/[/\\]/g, '_')
  const basic = trimmed.replace(/[^A-Za-z0-9._-]/g, '_')
  return basic.slice(0, 80) || 'file'
}
