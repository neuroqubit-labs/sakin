export default () => ({
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  database: {
    url: process.env['DATABASE_URL'],
  },
  jwt: {
    secret: process.env['JWT_SECRET'] ?? 'dev-jwt-secret-change-me-in-production',
    refreshSecret: process.env['JWT_REFRESH_SECRET'] ?? 'dev-jwt-refresh-secret-change-me',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  iyzico: {
    apiKey: process.env['IYZICO_API_KEY'],
    secretKey: process.env['IYZICO_SECRET_KEY'],
    baseUrl: process.env['IYZICO_BASE_URL'] ?? 'https://sandbox-api.iyzipay.com',
  },
  cors: {
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
  },
})
