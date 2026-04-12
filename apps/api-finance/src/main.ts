import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { HttpAdapterHost } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'
import { AllExceptionsFilter, TransformInterceptor } from '@sakin/api-core'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env['NODE_ENV'] !== 'production' }),
  )

  app.setGlobalPrefix('api/v1')
  const httpAdapterHost = app.get(HttpAdapterHost)
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost))
  app.useGlobalInterceptors(new TransformInterceptor())

  const port = parseInt(process.env['PORT'] ?? process.env['API_FINANCE_PORT'] ?? '3102', 10)
  await app.listen(port, '0.0.0.0')
  console.log(`api-finance listening on http://localhost:${port}/api/v1`)
}

bootstrap().catch(console.error)
