import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { HttpAdapterHost } from '@nestjs/core'
import type { ApiErrorResponse } from '@sakin/shared'

interface HttpRequest {
  method: string
  url: string
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    const request = ctx.getRequest<HttpRequest>()

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Sunucu hatası'
    let details: unknown

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const res = exception.getResponse()
      if (typeof res === 'string') {
        message = res
      } else if (typeof res === 'object' && res !== null) {
        message = (res as Record<string, unknown>)['message'] as string ?? message
        details = (res as Record<string, unknown>)['details']
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack)
    }

    const body: ApiErrorResponse = {
      statusCode,
      message,
      error: HttpStatus[statusCode],
      ...(details !== undefined && { details }),
    }

    // Fastify + NestJS: httpAdapter.reply raw socket'e yazar ve Fastify hook header'larını kaybeder.
    // CORS header'ları her error response'ta olması için raw response'a ekle.
    const rawResponse = response?.raw ?? response
    if (rawResponse && typeof rawResponse.setHeader === 'function') {
      const allowedOrigin = process.env['CORS_ORIGIN'] ?? 'http://localhost:3000'
      const reqOrigin = (request as unknown as { headers?: Record<string, string> }).headers?.['origin']
      if (reqOrigin === allowedOrigin) {
        rawResponse.setHeader('access-control-allow-origin', allowedOrigin)
        rawResponse.setHeader('access-control-allow-credentials', 'true')
      }
    }

    this.httpAdapterHost.httpAdapter.reply(response, body, statusCode)

    this.logger.warn(`${request.method} ${request.url} → ${statusCode}`)
  }
}
