import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  JWT_SECRET: z.string().min(16).default('dev-jwt-secret-change-me-in-production'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev-jwt-refresh-secret-change-me'),
  IYZICO_API_KEY: z.string().min(1).optional(),
  IYZICO_SECRET_KEY: z.string().min(1).optional(),
  IYZICO_BASE_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('Ortam değişkenleri doğrulama hatası:')
    console.error(result.error.flatten().fieldErrors)
    process.exit(1)
  }
  return result.data
}
