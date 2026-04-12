import 'reflect-metadata'
import * as dotenv from 'dotenv'
dotenv.config()
import { validateEnv } from './config/env.validation'

validateEnv()

import { NestFactory } from '@nestjs/core'
import { HttpAdapterHost } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/http-exception.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'
import { initializeFirebase } from './modules/auth/firebase.init'

async function bootstrap() {
  initializeFirebase()

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env['NODE_ENV'] !== 'production' }),
    { rawBody: true },
  )

  // Global prefix
  app.setGlobalPrefix('api/v1')

  // CORS
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    credentials: true,
  })

  // Global filters & interceptors
  const httpAdapterHost = app.get(HttpAdapterHost)
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost))
  app.useGlobalInterceptors(new TransformInterceptor())

  // Swagger (development only)
  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Sakin API')
      .setDescription('Bina Yönetim Sistemi API')
      .setVersion('1.0')
      .addBearerAuth()
      .build()

    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)
    console.log(`📚 Swagger: http://localhost:${process.env['PORT'] ?? 3001}/api/docs`)
  }

  const port = parseInt(process.env['PORT'] ?? '3001', 10)
  await app.listen(port, '0.0.0.0')
  console.log(`🚀 API: http://localhost:${port}/api/v1`)
}

bootstrap().catch(console.error)
