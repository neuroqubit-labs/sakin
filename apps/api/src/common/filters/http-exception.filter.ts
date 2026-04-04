import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { ApiErrorResponse } from '@sakin/shared'

// Framework-agnostic minimal response/request arayüzleri
interface HttpResponse {
  status(code: number): this
  send(body: unknown): void
}
interface HttpRequest {
  method: string
  url: string
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<HttpResponse>()
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

    response.status(statusCode).send(body)

    this.logger.warn(`${request.method} ${request.url} → ${statusCode}`)
  }
}
