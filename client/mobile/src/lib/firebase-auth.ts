type FirebaseAuthInstance = {
  currentUser: {
    uid: string
    getIdToken: () => Promise<string>
  } | null
  onAuthStateChanged: (
    listener: (user: { uid: string; getIdToken: () => Promise<string> } | null) => void,
  ) => () => void
  signInWithPhoneNumber: (phoneNumber: string) => Promise<{
    confirm: (code: string) => Promise<unknown>
  }>
}

type FirebaseAuthFactory = () => FirebaseAuthInstance

let authFactory: FirebaseAuthFactory | null = null

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-firebase/auth') as { default?: FirebaseAuthFactory }
  authFactory = mod.default ?? null
} catch {
  authFactory = null
}

export function isFirebaseNativeAvailable(): boolean {
  return authFactory !== null
}

export function getFirebaseAuth(): FirebaseAuthInstance | null {
  return authFactory ? authFactory() : null
}
