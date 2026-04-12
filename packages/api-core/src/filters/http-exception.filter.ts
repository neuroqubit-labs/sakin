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
        message = ((res as Record<string, unknown>)['message'] as string) ?? message
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

    this.httpAdapterHost.httpAdapter.reply(response, body, statusCode)
    this.logger.warn(`${request.method} ${request.url} -> ${statusCode}`)
  }
}
