import { initializeApp, getApps } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY'],
  authDomain: process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  messagingSenderId: process.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  appId: process.env['NEXT_PUBLIC_FIREBASE_APP_ID'],
}

function isConfigured(value: string | undefined): boolean {
  if (!value) return false
  if (value.startsWith('your-')) return false
  return true
}

export const hasFirebaseClientConfig =
  isConfigured(firebaseConfig.apiKey) &&
  isConfigured(firebaseConfig.authDomain) &&
  isConfigured(firebaseConfig.projectId) &&
  isConfigured(firebaseConfig.appId)

let auth: Auth | null = null

if (hasFirebaseClientConfig) {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!
  auth = getAuth(app)
} else {
  console.warn('Firebase client config eksik; admin panel dev bypass modunda auth kapali.')
}

export { auth }
