import * as admin from 'firebase-admin'

let initialized = false

export function initializeFirebase() {
  if (initialized) return

  const projectId = process.env['FIREBASE_PROJECT_ID']
  const clientEmail = process.env['FIREBASE_CLIENT_EMAIL']
  const privateKey = process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase yapılandırması eksik: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY gereklidir')
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  })

  initialized = true
}
