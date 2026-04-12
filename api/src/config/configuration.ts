export default () => ({
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  database: {
    url: process.env['DATABASE_URL'],
  },
  firebase: {
    projectId: process.env['FIREBASE_PROJECT_ID'],
    clientEmail: process.env['FIREBASE_CLIENT_EMAIL'],
    privateKey: process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n'),
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
