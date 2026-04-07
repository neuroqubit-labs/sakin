import * as admin from 'firebase-admin'

let initialized = false

export function initializeFirebase() {
  if (initialized) return

  const isDev = process.env['NODE_ENV'] !== 'production'
  const projectId = process.env['FIREBASE_PROJECT_ID']
  const clientEmail = process.env['FIREBASE_CLIENT_EMAIL']
  const privateKey = process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n')

  const isPlaceholder = projectId === 'dev-placeholder'

  if (isPlaceholder && isDev) {
    // Dev modda Firebase yerine sahte app başlat (sadece dev bypass için)
    admin.initializeApp({ projectId: 'dev-placeholder' })
    initialized = true
    console.warn('⚠️  Firebase dev modda çalışıyor — gerçek token doğrulama devre dışı')
    return
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase yapılandırması eksik: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY gereklidir')
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  })

  initialized = true
}
